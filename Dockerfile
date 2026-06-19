# 1. Grab the lightweight Node release matching the exact local version (v24.15.0)
FROM node:24-slim

# 2. Create the workspace directory inside the container
WORKDIR /usr/src/bot

# 3. Copy the package files first to leverage Docker's build cache
COPY package*.json ./

# 4. Run a clean install for production dependencies only
RUN npm ci --only=production

# 5. Copy all the bot files and folders (commands, slash commands, index.js) into the container
COPY . .

# 6. Start the bot using the standard directory entry command
CMD [ "node", "." ]
