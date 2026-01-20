from pydantic import BaseModel, EmailStr

class EmailIngest(BaseModel):
    from_email: EmailStr
    subject: str
    body_preview: str
    received_at: str
