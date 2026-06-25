# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

from __future__ import annotations

import argparse
import json
import os
import platform
import sys
import threading
import time
import traceback
import tracemalloc
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, Optional


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DEFAULT_LOG_FILE = SCRIPT_DIR / "resource_usage_log.txt"
LOG_LOCK = threading.Lock()

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def bytes_to_mb(value: Optional[int]) -> Optional[float]:
    if value is None:
        return None
    return round(value / 1024.0 / 1024.0, 2)


def get_windows_memory() -> Dict[str, Optional[int]]:
    if os.name != "nt":
        return {}

    try:
        import ctypes
        from ctypes import wintypes
    except Exception:
        return {}

    class ProcessMemoryCountersEx(ctypes.Structure):
        _fields_ = [
            ("cb", wintypes.DWORD),
            ("PageFaultCount", wintypes.DWORD),
            ("PeakWorkingSetSize", ctypes.c_size_t),
            ("WorkingSetSize", ctypes.c_size_t),
            ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
            ("QuotaPagedPoolUsage", ctypes.c_size_t),
            ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
            ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
            ("PagefileUsage", ctypes.c_size_t),
            ("PeakPagefileUsage", ctypes.c_size_t),
            ("PrivateUsage", ctypes.c_size_t),
        ]

    counters = ProcessMemoryCountersEx()
    counters.cb = ctypes.sizeof(ProcessMemoryCountersEx)

    try:
        handle = ctypes.windll.kernel32.GetCurrentProcess()
        ok = ctypes.windll.psapi.GetProcessMemoryInfo(
            handle,
            ctypes.byref(counters),
            counters.cb,
        )
    except Exception:
        return {}

    if not ok:
        return {}

    return {
        "rss_bytes": int(counters.WorkingSetSize),
        "peak_rss_bytes": int(counters.PeakWorkingSetSize),
        "private_bytes": int(counters.PrivateUsage),
    }


def get_unix_peak_memory() -> Dict[str, Optional[int]]:
    if os.name == "nt":
        return {}

    try:
        import resource
    except Exception:
        return {}

    usage = resource.getrusage(resource.RUSAGE_SELF)
    peak = int(usage.ru_maxrss)

    # Linux reports kilobytes; macOS reports bytes.
    if sys.platform != "darwin":
        peak *= 1024

    return {"peak_rss_bytes": peak}


def get_psutil_memory() -> Dict[str, Optional[int]]:
    try:
        import psutil
    except Exception:
        return {}

    try:
        memory = psutil.Process(os.getpid()).memory_info()
    except Exception:
        return {}

    return {
        "rss_bytes": int(getattr(memory, "rss", 0) or 0),
        "vms_bytes": int(getattr(memory, "vms", 0) or 0),
        "peak_rss_bytes": getattr(memory, "peak_wset", None),
    }


def get_process_memory() -> Dict[str, Optional[int]]:
    memory = get_psutil_memory()
    if memory:
        fallback = get_windows_memory() or get_unix_peak_memory()
        memory.update({k: v for k, v in fallback.items() if memory.get(k) is None and v is not None})
        return memory

    memory = get_windows_memory()
    if memory:
        return memory

    return get_unix_peak_memory()


class ResourceSampler:
    def __init__(self, interval_seconds: float) -> None:
        self.interval_seconds = max(0.05, float(interval_seconds))
        self.samples = []
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._started_at = 0.0
        self._last_wall = 0.0
        self._last_cpu = 0.0

    def start(self) -> None:
        self._started_at = time.perf_counter()
        self._last_wall = self._started_at
        self._last_cpu = time.process_time()
        self._sample(cpu_percent=0.0)
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self) -> Dict[str, Any]:
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=self.interval_seconds * 2)
        self._sample()
        return self.summary()

    def _run(self) -> None:
        while not self._stop_event.wait(self.interval_seconds):
            self._sample()

    def _sample(self, cpu_percent: Optional[float] = None) -> None:
        now = time.perf_counter()
        process_cpu = time.process_time()

        if cpu_percent is None:
            elapsed_wall = max(now - self._last_wall, 1e-9)
            elapsed_cpu = max(process_cpu - self._last_cpu, 0.0)
            cpu_percent = (elapsed_cpu / elapsed_wall) * 100.0

        self._last_wall = now
        self._last_cpu = process_cpu

        memory = get_process_memory()
        self.samples.append(
            {
                "elapsed_seconds": round(now - self._started_at, 4),
                "cpu_percent": round(cpu_percent, 2),
                "rss_mb": bytes_to_mb(memory.get("rss_bytes")),
                "peak_rss_mb": bytes_to_mb(memory.get("peak_rss_bytes")),
                "private_mb": bytes_to_mb(memory.get("private_bytes")),
                "vms_mb": bytes_to_mb(memory.get("vms_bytes")),
            }
        )

    def summary(self) -> Dict[str, Any]:
        if not self.samples:
            return {"samples": 0}

        cpu_values = [sample["cpu_percent"] for sample in self.samples]
        rss_values = [sample["rss_mb"] for sample in self.samples if sample["rss_mb"] is not None]
        peak_values = [
            sample["peak_rss_mb"]
            for sample in self.samples
            if sample["peak_rss_mb"] is not None
        ]

        return {
            "samples": len(self.samples),
            "sample_interval_seconds": self.interval_seconds,
            "average_cpu_percent": round(sum(cpu_values) / len(cpu_values), 2),
            "max_cpu_percent": round(max(cpu_values), 2),
            "start_rss_mb": rss_values[0] if rss_values else None,
            "end_rss_mb": rss_values[-1] if rss_values else None,
            "max_sampled_rss_mb": max(rss_values) if rss_values else None,
            "peak_rss_mb": max(peak_values) if peak_values else None,
        }


def prepare_cuda_measurement() -> Optional[Any]:
    try:
        import torch
    except Exception:
        return None

    try:
        if torch.cuda.is_available():
            for index in range(torch.cuda.device_count()):
                torch.cuda.reset_peak_memory_stats(index)
            torch.cuda.synchronize()
    except Exception:
        pass

    return torch


def sync_cuda(torch_module: Optional[Any]) -> None:
    if torch_module is None:
        return

    try:
        if torch_module.cuda.is_available():
            torch_module.cuda.synchronize()
    except Exception:
        pass


def get_cuda_summary(torch_module: Optional[Any]) -> Dict[str, Any]:
    if torch_module is None:
        return {"available": False}

    try:
        if not torch_module.cuda.is_available():
            return {"available": False}

        devices = []
        for index in range(torch_module.cuda.device_count()):
            devices.append(
                {
                    "index": index,
                    "name": torch_module.cuda.get_device_name(index),
                    "allocated_mb": bytes_to_mb(torch_module.cuda.memory_allocated(index)),
                    "reserved_mb": bytes_to_mb(torch_module.cuda.memory_reserved(index)),
                    "max_allocated_mb": bytes_to_mb(torch_module.cuda.max_memory_allocated(index)),
                    "max_reserved_mb": bytes_to_mb(torch_module.cuda.max_memory_reserved(index)),
                }
            )
        return {"available": True, "devices": devices}
    except Exception as exc:
        return {"available": False, "error": str(exc)}


def summarize_result(result: Dict[str, Any]) -> Dict[str, Any]:
    structured = result.get("structured") or {}
    fractures = structured.get("fractures") if isinstance(structured, dict) else []

    return {
        "request_id": result.get("request_id"),
        "groups": result.get("groups"),
        "detections_count": len(result.get("detections") or []),
        "rois_count": len(result.get("rois") or []),
        "fractures_count": len(fractures or []),
        "pdf_url": result.get("pdf_url"),
        "pdf_url_en": result.get("pdf_url_en"),
        "pdf_url_ar": result.get("pdf_url_ar"),
    }


def append_log(log_file: Path, data: Dict[str, Any]) -> None:
    log_file.parent.mkdir(parents=True, exist_ok=True)
    with LOG_LOCK:
        with log_file.open("a", encoding="utf-8") as handle:
            handle.write("=" * 90)
            handle.write("\n")
            handle.write(json.dumps(data, indent=2, default=str))
            handle.write("\n\n")


def is_resource_logging_enabled() -> bool:
    value = os.environ.get("FDRPP_RESOURCE_LOG_ENABLED", "1").strip().lower()

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

    return value not in {"0", "false", "no", "off"}


def get_resource_log_file(log_file: Optional[str] = None) -> Path:
    selected = log_file or os.environ.get("FDRPP_RESOURCE_LOG_PATH") or str(DEFAULT_LOG_FILE)
    return Path(selected).expanduser().resolve()


def get_sample_interval(default: float = 0.25) -> float:
    raw_value = os.environ.get("FDRPP_RESOURCE_SAMPLE_INTERVAL")
    if not raw_value:
        return default

    try:
        return float(raw_value)
    except ValueError:
        return default


def build_request_metadata(request: Optional[Any], upload_file: Optional[Any]) -> Dict[str, Any]:
    metadata = {
        "method": None,
        "url": None,
        "client": None,
        "filename": None,
        "content_type": None,
    }

    if request is not None:
        metadata["method"] = getattr(request, "method", None)
        metadata["url"] = str(getattr(request, "url", "")) or None
        client = getattr(request, "client", None)
        if client is not None:
            host = getattr(client, "host", None)
            port = getattr(client, "port", None)
            metadata["client"] = f"{host}:{port}" if port is not None else host

    if upload_file is not None:
        metadata["filename"] = getattr(upload_file, "filename", None)
        metadata["content_type"] = getattr(upload_file, "content_type", None)

    return metadata


def profile_call(
    call: Callable[[], Dict[str, Any]],
    *,
    source: str,
    image_size_bytes: Optional[int] = None,
    request_metadata: Optional[Dict[str, Any]] = None,
    log_file: Optional[str] = None,
    sample_interval: Optional[float] = None,
    include_tracemalloc: bool = False,
) -> Dict[str, Any]:
    if not is_resource_logging_enabled():
        return call()

    selected_log_file = get_resource_log_file(log_file)
    interval = sample_interval if sample_interval is not None else get_sample_interval()

    data: Dict[str, Any] = {
        "started_at": datetime.now().isoformat(timespec="seconds"),
        "status": "started",
        "source": source,
        "request": request_metadata or {},
        "inputs": {
            "image_size_bytes": image_size_bytes,
            "log_file": str(selected_log_file),
        },
        "environment": {
            "python": sys.version.split()[0],
            "platform": platform.platform(),
            "processor": platform.processor(),
            "pid": os.getpid(),
            "cpu_count": os.cpu_count(),
        },
        "timings_seconds": {},
        "resources": {},
        "cuda": {},
        "result_summary": {},
    }

    sampler = ResourceSampler(interval)
    torch_module: Optional[Any] = None
    overall_started = time.perf_counter()
    process_cpu_started = time.process_time()
    tracing_started_here = False

    if include_tracemalloc and not tracemalloc.is_tracing():
        tracemalloc.start()
        tracing_started_here = True

    sampler.start()

    try:
        torch_module = prepare_cuda_measurement()
        run_started = time.perf_counter()
        result = call()
        sync_cuda(torch_module)
        data["timings_seconds"]["pipeline_run"] = round(time.perf_counter() - run_started, 4)
        data["result_summary"] = summarize_result(result)
        data["status"] = "completed"
        return result
    except Exception as exc:
        data["status"] = "failed"
        data["error"] = {
            "type": type(exc).__name__,
            "message": str(exc),
            "traceback": traceback.format_exc(),
        }
        raise
    finally:
        data["timings_seconds"]["total_wall"] = round(time.perf_counter() - overall_started, 4)
        data["timings_seconds"]["total_process_cpu"] = round(
            time.process_time() - process_cpu_started,
            4,
        )
        data["resources"]["process_samples"] = sampler.stop()

        if include_tracemalloc:
            current_traced, peak_traced = tracemalloc.get_traced_memory()
            data["resources"]["python_tracemalloc"] = {
                "current_mb": bytes_to_mb(current_traced),
                "peak_mb": bytes_to_mb(peak_traced),
            }
            if tracing_started_here:
                tracemalloc.stop()

        data["cuda"] = get_cuda_summary(torch_module)
        data["finished_at"] = datetime.now().isoformat(timespec="seconds")
        append_log(selected_log_file, data)


def profile_pipeline_request(
    pipeline: Any,
    image_bytes: bytes,
    *,
    request: Optional[Any] = None,
    upload_file: Optional[Any] = None,
    output_root: Optional[Path] = None,
    base_url: Optional[str] = None,
    log_file: Optional[str] = None,
    sample_interval: Optional[float] = None,
) -> Dict[str, Any]:
    def run_pipeline() -> Dict[str, Any]:
        kwargs: Dict[str, Any] = {}
        if output_root is not None:
            kwargs["output_root"] = output_root
        if base_url is not None:
            kwargs["base_url"] = base_url
        if kwargs:
            return pipeline.run(image_bytes, **kwargs)
        return pipeline.run(image_bytes)

    return profile_call(
        run_pipeline,
        source="api_request",
        image_size_bytes=len(image_bytes),
        request_metadata=build_request_metadata(request, upload_file),
        log_file=log_file,
        sample_interval=sample_interval,
        include_tracemalloc=False,
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run the fracture pipeline and append resource usage metrics to a text log."
    )
    parser.add_argument("image_path", help="Path to the X-ray image to process")
    parser.add_argument(
        "--config",
        default=str(PROJECT_ROOT / "config.yaml"),
        help="Path to config.yaml",
    )
    parser.add_argument(
        "--log-file",
        default=str(DEFAULT_LOG_FILE),
        help="Text file where the resource usage report will be appended",
    )
    parser.add_argument(
        "--sample-interval",
        type=float,
        default=0.25,
        help="Seconds between CPU and memory samples",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    launch_cwd = Path.cwd().resolve()
    image_path = Path(args.image_path).expanduser().resolve()
    config_path = Path(args.config).expanduser().resolve()
    log_file = Path(args.log_file).expanduser().resolve()
    os.chdir(PROJECT_ROOT)

    data: Dict[str, Any] = {
        "started_at": datetime.now().isoformat(timespec="seconds"),
        "status": "started",
        "inputs": {
            "image_path": str(image_path),
            "image_size_bytes": None,
            "config_path": str(config_path),
            "log_file": str(log_file),
        },
        "environment": {
            "python": sys.version.split()[0],
            "platform": platform.platform(),
            "processor": platform.processor(),
            "pid": os.getpid(),
            "cpu_count": os.cpu_count(),
            "launch_cwd": str(launch_cwd),
            "project_root": str(PROJECT_ROOT),
        },
        "timings_seconds": {},
        "resources": {},
        "cuda": {},
        "result_summary": {},
    }

    overall_started = time.perf_counter()
    process_cpu_started = time.process_time()
    sampler = ResourceSampler(args.sample_interval)
    torch_module: Optional[Any] = None
    exit_code = 0

    tracemalloc.start()
    sampler.start()

    try:
        if not image_path.exists():
            raise FileNotFoundError(f"Image path does not exist: {image_path}")
        if not config_path.exists():
            raise FileNotFoundError(f"Config path does not exist: {config_path}")

        image_bytes = image_path.read_bytes()
        data["inputs"]["image_size_bytes"] = len(image_bytes)

        torch_module = prepare_cuda_measurement()

        from pipeline.main import FracturePipeline

        init_started = time.perf_counter()
        pipeline = FracturePipeline(config_path=str(config_path))
        sync_cuda(torch_module)
        data["timings_seconds"]["pipeline_init"] = round(time.perf_counter() - init_started, 4)

        run_started = time.perf_counter()
        result = pipeline.run(image_bytes)
        sync_cuda(torch_module)
        data["timings_seconds"]["pipeline_run"] = round(time.perf_counter() - run_started, 4)

        data["result_summary"] = summarize_result(result)
        data["status"] = "completed"
    except Exception as exc:
        exit_code = 1
        data["status"] = "failed"
        data["error"] = {
            "type": type(exc).__name__,
            "message": str(exc),
            "traceback": traceback.format_exc(),
        }
    finally:
        current_traced, peak_traced = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        data["timings_seconds"]["total_wall"] = round(time.perf_counter() - overall_started, 4)
        data["timings_seconds"]["total_process_cpu"] = round(
            time.process_time() - process_cpu_started,
            4,
        )
        data["resources"]["process_samples"] = sampler.stop()
        data["resources"]["python_tracemalloc"] = {
            "current_mb": bytes_to_mb(current_traced),
            "peak_mb": bytes_to_mb(peak_traced),
        }
        data["cuda"] = get_cuda_summary(torch_module)
        data["finished_at"] = datetime.now().isoformat(timespec="seconds")

        append_log(log_file, data)

    print(f"Resource usage log written to: {log_file}")
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]