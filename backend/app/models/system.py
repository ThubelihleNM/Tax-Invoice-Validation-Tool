from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, func
from app.database.connection import Base

class BackupRecord(Base):
    __tablename__ = "backup_records"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(255), nullable=False)
    file_size = Column(Numeric(10, 2), default=0.00, nullable=False)  # Size in MB
    status = Column(String(50), default="Success", nullable=False)     # "Success", "Failed"
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, index=True)
    log_type = Column(String(50), nullable=False)  # "API", "OCR", "Validation", "Database", "Authentication", "Server"
    message = Column(Text, nullable=False)
    traceback = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
