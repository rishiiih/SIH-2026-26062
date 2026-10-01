import qrcode
import base64
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.cargo import Consignment
from app.security import get_current_user

router = APIRouter(prefix="/api/cargo", tags=["Cargo & Custody"])

@router.get("/{consignment_id}/qr")
def generate_qr(consignment_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    consignment = db.query(Consignment).filter(Consignment.id == consignment_id).first()
    
    if not consignment:
        raise HTTPException(status_code=404, detail="Consignment not found")
    
    # The payload embedded inside the QR code
    qr_payload = f'{{"id": "{consignment.id}", "v": {consignment.version}}}'
    
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(qr_payload)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert image to base64 string
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    return {
        "consignment_id": consignment.id,
        "payload": qr_payload,
        "qr_base64": f"data:image/png;base64,{img_b64}"
    }