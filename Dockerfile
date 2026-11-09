FROM python:3.11-slim

WORKDIR /app

# Copy backend files
COPY ./backend /app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose default Hugging Face port
EXPOSE 7860

# Start FastAPI server on port 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
