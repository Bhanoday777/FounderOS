# Use python 3.12 slim image for production-ready size
FROM python:3.12-slim

# Set working directory inside container
WORKDIR /app

# Copy dependency definition
COPY requirements.txt .

# Install dependencies without cache
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose FastAPI default port
EXPOSE 8000

# Start server using uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
