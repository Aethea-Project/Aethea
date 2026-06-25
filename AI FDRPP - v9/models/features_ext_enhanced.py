import cv2
import numpy as np
from skimage.feature import graycomatrix, graycoprops


# -----------------------------
# FEATURE EXTRACTION
# -----------------------------
def extract_features(roi):
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)

    edges = cv2.Canny(gray, 50, 150)
    edge_pixels = edges.sum() / 255
    area = roi.shape[0] * roi.shape[1]
    edge_density = edge_pixels / area

    lines = cv2.HoughLinesP(
        edges, 1, np.pi/180,
        threshold=25,
        minLineLength=8,
        maxLineGap=12
    )
    num_lines = 0 if lines is None else len(lines)

    kernel = np.ones((3, 3), np.uint8)
    edges_clean = cv2.morphologyEx(edges, cv2.MORPH_OPEN, kernel)

    num_labels, labels = cv2.connectedComponents(edges_clean)

    disruptions = 0
    min_area = 10 if area < 5000 else 30

    for i in range(1, num_labels):
        comp = (labels == i).astype("uint8") * 255
        comp_area = comp.sum() / 255

        if min_area < comp_area < 15000:
            disruptions += 1

    glcm = graycomatrix(gray, [1], [0], 256, symmetric=True, normed=True)
    contrast = float(graycoprops(glcm, 'contrast')[0, 0])

    mean = float(gray.mean())
    std = float(gray.std())

    # Curvature (angulation)
    ys, xs = np.where(edges > 0)
    curvature = 0
    if len(xs) > 50:
        fit = np.polyfit(xs, ys, 1)
        y_pred = fit[0] * xs + fit[1]
        curvature = float(np.mean(np.abs(ys - y_pred)))

    # 🔥 NEW: SHAPE IRREGULARITY
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    irregularity = 0
    if len(contours) > 0:
        cnt = max(contours, key=cv2.contourArea)

        if len(cnt) >= 5:
            hull = cv2.convexHull(cnt)
            hull_area = cv2.contourArea(hull)
            cnt_area = cv2.contourArea(cnt)

            if hull_area > 0:
                irregularity = float((hull_area - cnt_area) / hull_area)

    return {
        "edge_density": edge_density,
        "lines": num_lines,
        "disruptions": disruptions,
        "contrast": contrast,
        "mean": mean,
        "std": std,
        "roi_area": area,
        "curvature": curvature,
        "irregularity": irregularity
    }


# -----------------------------
# LOCAL PATCH ANALYSIS
# -----------------------------
def extract_features_local(roi, patch_size=64, overlap=0.5):
    h, w = roi.shape[:2]

    patch_size = max(16, int(patch_size))
    step = max(1, int(patch_size * (1.0 - float(overlap))))

    best_score = -1
    best_features = None

    for y in range(0, max(h - patch_size, 1), step):
        for x in range(0, max(w - patch_size, 1), step):

            patch = roi[y:y+patch_size, x:x+patch_size]

            if patch.shape[0] < 20 or patch.shape[1] < 20:
                continue

            f = extract_features(patch)

            score = (
                f["edge_density"] +
                0.05 * f["contrast"] +
                0.5 * f["disruptions"] +
                2.0 * f["irregularity"]   # 🔥 SHAPE importance
            )

            if score > best_score:
                best_score = score
                best_features = f

    if best_features is None:
        return extract_features(roi)

    return best_features


# -----------------------------
# CLASSIFICATION
# -----------------------------
def classify_fracture(roi, f):
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)

    lines = cv2.HoughLinesP(
        edges, 1, np.pi/180,
        threshold=25,
        minLineLength=8,
        maxLineGap=12
    )

    angles = []

    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            length = np.hypot(x2 - x1, y2 - y1)

            if length < 10:
                continue

            angle = np.degrees(np.arctan2((y2 - y1), (x2 - x1)))
            angles.append(angle)

    if len(angles) >= 2:
        angles = np.abs(np.array(angles))
        mean_angle = float(np.mean(angles))
        std_angle = float(np.std(angles))

        valid_angle = (
            std_angle < 15 and
            (f["disruptions"] > 0 or f["edge_density"] > 0.05)
        )
    else:
        mean_angle = None
        valid_angle = False

    types = []

    if f["curvature"] > 8 and f["roi_area"] > 8000:
        types.append("angulated")

    if f["disruptions"] >= 4:
        types.append("comminuted")

    if valid_angle:
        if mean_angle < 20:
            types.append("transverse")
        elif 20 <= mean_angle <= 60:
            types.append("oblique")
        else:
            types.append("spiral")

    if len(types) == 0:
        if f["edge_density"] > 0.045 or f["irregularity"] > 0.02:
            return {"angle": 0.0, "type": "possible transverse"}
        else:
            return {"angle": None, "type": "indeterminate"}

    return {
        "angle": round(mean_angle, 2) if mean_angle else None,
        "type": " + ".join(types)
    }


# -----------------------------
# INTERPRETATION
# -----------------------------
def interpret(f):
    result = {}

    # 🔥 improved discontinuity
    if (
        f["edge_density"] > 0.05 or
        f["contrast"] > 12 or
        f["irregularity"] > 0.02
    ):
        result["discontinuity"] = "high"
    else:
        result["discontinuity"] = "low"

    # small ROI
    if f["roi_area"] < 5000:
        if (
            f["edge_density"] > 0.05 or
            f["contrast"] > 20 or
            f["irregularity"] > 0.02
        ):
            result["fracture_lines"] = "possible"
        else:
            result["fracture_lines"] = "none"

        result["texture"] = "disrupted" if f["contrast"] > 15 else "normal"
        result["bone_variation"] = "high" if f["std"] > 30 else "low"
        result["confidence"] = "moderate"
        return result

    if (
        f["disruptions"] > 0 or
        f["lines"] > 2 or
        f["irregularity"] > 0.02
    ):
        result["fracture_lines"] = "possible"
    else:
        result["fracture_lines"] = "none"

    result["texture"] = "disrupted" if f["contrast"] > 3 else "normal"
    result["bone_variation"] = "high" if f["std"] > 35 else "low"

    # 🔥 shape-based confidence boost
    if f["irregularity"] > 0.03:
        result["confidence"] = "high"
        return result

    if f["disruptions"] >= 2 and f["edge_density"] > 0.04:
        result["confidence"] = "high"
        return result

    result["confidence"] = "moderate"
    return result


# -----------------------------
# DRAW
# -----------------------------
def draw_results(img, results):
    for r in results:
        x1, y1, x2, y2 = r["box"]
        interp = r["interpretation"]
        cls = r["classification"]

        color = (0, 255, 0) if interp["confidence"] == "high" else (0, 165, 255)

        cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)

        angle_text = f'{cls["angle"]}°' if cls["angle"] else "N/A"
        text = f'{cls["type"]} | {angle_text}'

        cv2.putText(img, text, (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    return img


