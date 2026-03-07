from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from api.routes import auth, data

# Generate DB Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart & Tick - Authentication API")

# Setup CORS to allow React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Auth Router
app.include_router(auth.router)
app.include_router(data.router)

@app.get("/")
def read_root():
    return {"message": "Bienvenue sur l'API Smart & Tick"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)