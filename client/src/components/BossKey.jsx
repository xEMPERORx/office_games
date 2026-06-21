export default function BossKey({ onExit }) {
  const fakeCode = `from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.config import settings
from app.models.user import User, UserCreate, UserResponse
from app.services.database import get_db
from app.services.cache import redis_client

app = FastAPI(title="API Service", version="2.1.0")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
logger = logging.getLogger(__name__)


@app.get("/api/v1/users", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
):
    """Fetch paginated users with caching."""
    cache_key = f"users:{skip}:{limit}"
    cached = await redis_client.get(cache_key)
    if cached:
        return cached

    users = db.query(User).offset(skip).limit(limit).all()
    await redis_client.set(cache_key, users, ex=300)
    return users


@app.post("/api/v1/users", response_model=UserResponse, status_code=201)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    """Create a new user with validation."""
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )
    
    user = User(**user_data.dict())
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info(f"User created: {user.id}")
    return user


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}`;

  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e] font-mono text-sm cursor-text" onClick={onExit} title="Press Ctrl+B to return">
      <div className="h-8 bg-[#323233] flex items-center px-4 text-[11px] text-gray-400">
        <span className="mr-4">●&nbsp;●&nbsp;●</span>
        <span>main.py — api-service — Visual Studio Code</span>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-48 bg-[#252526] border-r border-[#3e3e3e] p-2 text-[11px] text-gray-400">
          <div className="mb-2 text-[10px] uppercase text-gray-500 font-bold">Explorer</div>
          <div className="pl-2">📁 app</div>
          <div className="pl-4 text-blue-300">🐍 main.py</div>
          <div className="pl-4">🐍 config.py</div>
          <div className="pl-4">📁 models</div>
          <div className="pl-6">🐍 user.py</div>
          <div className="pl-6">🐍 schemas.py</div>
          <div className="pl-4">📁 routers</div>
          <div className="pl-6">🐍 auth.py</div>
          <div className="pl-6">🐍 users.py</div>
          <div className="pl-4">📁 services</div>
          <div className="pl-6">🐍 database.py</div>
          <div className="pl-2">📁 tests</div>
          <div className="pl-2">📄 requirements.txt</div>
          <div className="pl-2">📄 Dockerfile</div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-[13px] leading-5">
            {fakeCode.split('\n').map((line, i) => (
              <div key={i} className="flex">
                <span className="w-8 text-right pr-4 text-gray-600 select-none text-[11px]">{i + 1}</span>
                <span className="text-[#d4d4d4]">{colorPython(line)}</span>
              </div>
            ))}
          </pre>
        </div>
      </div>
      <div className="h-6 bg-[#007acc] flex items-center px-3 text-[11px] text-white">
        <span className="mr-4">⎇ develop</span>
        <span className="mr-4">✓ 0 ⚠ 0</span>
        <span>Ln 42, Col 4</span>
        <span className="ml-auto">Python 3.11 (venv)</span>
      </div>
    </div>
  );
}

function colorPython(line) {
  // Basic syntax highlighting
  return <span dangerouslySetInnerHTML={{ __html: line
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(from|import|async|def|await|if|return|raise)\b/g, '<span style="color:#c586c0">$1</span>')
    .replace(/(FastAPI|Depends|HTTPException|Session|List|Optional|str|int)\b/g, '<span style="color:#4ec9b0">$1</span>')
    .replace(/@\w+/g, '<span style="color:#dcdcaa">$&</span>')
    .replace(/(""".*?"""|"[^"]*"|'[^']*'|f"[^"]*")/g, '<span style="color:#ce9178">$&</span>')
    .replace(/#.*/g, '<span style="color:#6a9955">$&</span>')
  }} />;
}
