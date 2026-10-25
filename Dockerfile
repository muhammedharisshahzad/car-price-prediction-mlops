FROM python:3.11-slim

WORKDIR /app

# Prevent Python from writing pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Port defaults to 7860 (Hugging Face default) or 5000
ENV PORT=7860
EXPOSE 7860

CMD ["python", "app.py"]
