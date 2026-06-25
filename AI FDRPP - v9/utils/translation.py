# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

"""Simple translation wrapper supporting multiple providers.

Uses environment variables to select provider and API key:
- TRANSLATION_PROVIDER: 'openai' or 'google' (default: try openai then google)
- TRANSLATE_API_KEY: API key for the provider
- TRANSLATION_MODEL: optional model name

If no provider is available this will return the original text.
"""
from __future__ import annotations

import os
from typing import Optional


def translate_text(text: str, source_lang: str = "en", target_lang: str = "ar", provider: Optional[str] = None, model: Optional[str] = None, api_key: Optional[str] = None) -> str:
    if not text:
        return text

    provider = provider or os.environ.get("TRANSLATION_PROVIDER")
    api_key = api_key or os.environ.get("TRANSLATE_API_KEY")
    model = model or os.environ.get("TRANSLATION_MODEL")

    # Try OpenAI first if requested or available
    if provider in (None, "openai", "gpt"):
        try:
            import openai

            if api_key:
                openai.api_key = api_key

            model_name = model or ("gpt-4o-mini" if hasattr(openai, "ChatCompletion") else "gpt-3.5-turbo")
            prompt = [
                {"role": "system", "content": f"You are a precise translator. Translate the user's clinical report from {source_lang} to {target_lang}. Preserve clinical terms and do not add commentary."},
                {"role": "user", "content": text},
            ]
            resp = openai.ChatCompletion.create(model=model_name, messages=prompt, temperature=0.0)
            # ChatCompletion response structure may vary; try to extract safely
            choice = resp.choices[0]
            translated = choice.message.get("content") if hasattr(choice, "message") else choice.text
            return translated.strip() if translated else text
        except Exception:
            pass

    # Try Google Generative AI
    if provider in (None, "google", "gemini"):
        try:
            import google.generativeai as genai

            if api_key:
                genai.api_key = api_key

            model_name = model or "models/text-bison-001"
            prompt = f"Translate the following clinical report from {source_lang} to {target_lang}. Reply with the translated text only:\n\n{text}"
            resp = genai.generate(model=model_name, text=prompt)
            # response content may be in resp.text

# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

            translated = getattr(resp, "text", None) or (resp.output[0].content[0].text if getattr(resp, "output", None) else None)
            return translated.strip() if translated else text
        except Exception:
            pass

    # Fallback: return original text
    return text


def translate_structured(structured: dict, source_lang: str = "en", target_lang: str = "ar") -> dict:
    """Translate key human-readable fields inside a structured response.

    This translates labels and short text fields to minimize token usage by
    translating only selected fields instead of the whole JSON.
    """
    if not isinstance(structured, dict):
        return structured

    out = dict(structured)

    # body_part.label
    bp = out.get("body_part") or {}
    if isinstance(bp, dict) and isinstance(bp.get("label"), str):
        bp = dict(bp)
        bp["label"] = translate_text(bp["label"], source_lang, target_lang)
        out["body_part"] = bp

    # fracture_type.label
    ft = out.get("fracture_type") or {}
    if isinstance(ft, dict) and isinstance(ft.get("label"), str):
        ft = dict(ft)
        ft["label"] = translate_text(ft["label"], source_lang, target_lang)
        out["fracture_type"] = ft

    # fractures list: translate a few fields per fracture
    frs = out.get("fractures") or []
    new_fr = []
    for f in frs:
        if not isinstance(f, dict):
            new_fr.append(f)
            continue
        nf = dict(f)
        for key in ("body_part", "bone", "type", "rule_based_type_hint"):
            if isinstance(nf.get(key), str):
                nf[key] = translate_text(nf[key], source_lang, target_lang)
        # interpretation.text if exists
        interp = nf.get("interpretation") or {}
        if isinstance(interp, dict) and isinstance(interp.get("text"), str):
            interp = dict(interp)
            interp["text"] = translate_text(interp["text"], source_lang, target_lang)
            nf["interpretation"] = interp
        new_fr.append(nf)
    out["fractures"] = new_fr

    return out


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]