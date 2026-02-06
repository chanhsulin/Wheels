# Room Interaction App

A minimal real-time web app where users join the same room using a code and interact (chat, see participants).

Quick start

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Start the server:

   ```powershell
   npm start
   ```

3. Open http://localhost:3000 in two different browser windows or devices. Generate or enter the same room code and join to interact.

Notes

- This is intentionally minimal. It's a good starting point for adding features like persistent messages, authentication, or richer collaboration tools.

Deploying to a cloud service (Render/Heroku/Railway)

If you want the app publicly reachable without running it from your PC you can deploy the server to a cloud host. The repository already includes a `Procfile` and `Dockerfile` for simple deployments.

Quick Render / Railway / Heroku steps (example):

1. Commit and push your repository to GitHub.
2. Create an account on Render (https://render.com) or Railway/Heroku and create a new Web Service.
3. For Render: connect your GitHub repo, select the branch, and Render will detect Node and deploy the app. For Heroku you can connect the repo or use `git push heroku main`.
4. The service will give you a public HTTPS URL (e.g. `https://your-app.onrender.com`).
5. Point your client to the public server URL if needed (see `public/client.js`). If you want the client served from the same host, deploy the whole repo — the server serves the `public/` directory.

Docker deployment

You can also build the provided `Dockerfile` and run the container locally or push it to a container registry:

```powershell
# build
docker build -t roomapp:latest .

# run
docker run -p 3000:3000 roomapp:latest
```

Notes about HTTPS and client hosting

- If you host the client on GitHub Pages, update the client to connect to your server's public URL (see previous instructions). Browsers block mixed content, so prefer HTTPS for both the client and the Socket.io server.

