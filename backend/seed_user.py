from app.db import SessionLocal
from app.models.user import User
from app.security import get_password_hash

def seed_admin():
    db = SessionLocal()
    
    # Check if admin2 already exists
    user = db.query(User).filter(User.username == 'admin2').first()
    
    if user:
        # If it exists, just force-update the password using FastAPI's passlib
        user.password_hash = get_password_hash('password123')
        print("Updated existing 'admin2' with the correct FastAPI password hash!")
    else:
        # If it doesn't exist, create it from scratch
        user = User(
            username='admin2',
            email='admin2@test.com',
            full_name='Admin User',
            password_hash=get_password_hash('password123')
        )
        db.add(user)
        print("Created a fresh 'admin2' user for FastAPI!")
        
    db.commit()
    db.close()

if __name__ == "__main__":
    seed_admin()