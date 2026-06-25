# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

from typing import Any, Dict, Optional

from pydantic import BaseModel



# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]

class AnalyzeRequest(BaseModel):
    # Optional metadata fields for the analyze endpoint
    patient_id: Optional[str] = None
    study_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# [Mohmed Safwat (Bo3ly) - aifdrpp-v9 - @06/06/2026]