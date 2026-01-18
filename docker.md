# Formmate

## Docker Deployment (Integrated with FormCMS)

To build and run Formmate and FormCMS together in a single container, follow these steps:

```bash
# 1. Go to your repos directory
cd /Users/jingshunchen/repos

# 2. Build using the Formmate Dockerfile
docker build -t formmate-integrated -f formmate/Dockerfile .

# 3. Run the container
docker run -p 3001:3001 -p 5000:5000 formmate-integrated
```

The application will be available at:
- **Frontend/API**: `http://localhost:3001/mate`
- **FormCMS**: `http://localhost:5000`
