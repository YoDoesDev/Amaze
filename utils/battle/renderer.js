const {
    createCanvas,
    loadImage,
} = require("@napi-rs/canvas");

const {
    AttachmentBuilder,
} = require("discord.js");

const path = require("path");

// --- PERFORMANCE OPTIMIZATION: LOAD STATIC ASSETS ONCE ON BOOT ---
const backgroundPath = path.join(__dirname, "..", "assets", "battle", "background.png");
const healthBarPath = path.join(__dirname, "..", "assets", "battle", "healthBar.png");
const swordPath = path.join(__dirname, "..", "assets", "battle", "sword.png");
const cloudPath = path.join(__dirname, "..", "assets", "battle", "fightingCloud.png");

let bg, hpBar, swordImg, cloudImg;
let assetsLoaded = false;

async function initAssets() {
    if (assetsLoaded) return;
    bg = await loadImage(backgroundPath);
    hpBar = await loadImage(healthBarPath);
    swordImg = await loadImage(swordPath);
    cloudImg = await loadImage(cloudPath);
    assetsLoaded = true;
}

// Pre-load assets immediately when the module is required
initAssets().catch(err => console.error("Failed to pre-load battle assets:", err));

async function render(self, opp, stage, maxSelfHP, maxOppHP) {
    // Ensure assets are loaded just in case the initial boot call wasn't finished
    await initAssets();

    const canvas = createCanvas(1280, 720);
    const ctx = canvas.getContext("2d");

    // Fetch user avatars
    const selfAvatar = await loadImage(self.user.displayAvatarURL({ extension: "png", size: 512 }));
    const oppAvatar = await loadImage(opp.user.displayAvatarURL({ extension: "png", size: 512 }));

    // 1. Draw the Background Arena
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    // 2. Global UI: Render Upper Corner RED Health Bars
    drawTopUI(ctx, hpBar, self, opp, maxSelfHP, maxOppHP, canvas.width);

    const leftX = 220;
    const rightX = 860;
    const y = 260;
    const avatarSize = 170;

    // 3. Stage Rendering Logic
    if (stage === 2) {
        // Mid-fight: Draw the cartoon cloud over the player areas
        ctx.drawImage(cloudImg, 350, 120, 580, 430);
    } else if (stage === 3) {
        // Stage 3 (Result): Detect who lost to handle rotation cleanly without clipping dual images
        const loser = self.hp <= 0 ? "left" : "right";

        if (loser === "left") {
            // Draw right player (winner) normally
            drawPlayer(ctx, swordImg, rightX, y, oppAvatar, opp, true, avatarSize);

            // Draw left player knocked out (Rotated 90 degrees)
            ctx.save();
            ctx.translate(leftX + avatarSize / 2, y + avatarSize / 2);
            ctx.rotate(-Math.PI / 2);
            
            // Apply circular clip to the dead/fallen avatar too!
            ctx.beginPath();
            ctx.arc(0, 0, avatarSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            
            ctx.drawImage(selfAvatar, -avatarSize / 2, -avatarSize / 2, avatarSize, avatarSize);
            ctx.restore();
        } else {
            // Draw left player (winner) normally
            drawPlayer(ctx, swordImg, leftX, y, selfAvatar, self, false, avatarSize);

            // Draw right player knocked out (Rotated 90 degrees)
            ctx.save();
            ctx.translate(rightX + avatarSize / 2, y + avatarSize / 2);
            ctx.rotate(Math.PI / 2);
            
            // Apply circular clip to the dead/fallen avatar too!
            ctx.beginPath();
            ctx.arc(0, 0, avatarSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            ctx.drawImage(oppAvatar, -avatarSize / 2, -avatarSize / 2, avatarSize, avatarSize);
            ctx.restore();
        }
    } else {
        // Stage 1 (Intro/Standard Turns): Draw both players normally
        drawPlayer(ctx, swordImg, leftX, y, selfAvatar, self, false, avatarSize);
        drawPlayer(ctx, swordImg, rightX, y, oppAvatar, opp, true, avatarSize);
    }

    return new AttachmentBuilder(canvas.toBuffer("image/png"), {
        name: "battle.png",
    });
}

// Dedicated function for Top Header Health Status UI
function drawTopUI(ctx, hpBarImg, self, opp, maxSelfHP, maxOppHP, canvasWidth) {
    const topY = 50;      // Distance from top edge
    
    const selfLeftX = 60;                     // Upper Left Corner for Self asset
    const oppLeftX = canvasWidth - 60 - 300;  // Upper Right Corner for Opponent asset

    // --- 1. LEFT PLAYER (SELF) HEALTH BAR ---
    // Draw the texture asset frame background FIRST so shapes can be layered on top
    ctx.drawImage(hpBarImg, selfLeftX - 15, topY - 10, 330, 55);

    const selfRatio = Math.max(0, Math.min(1, self.hp / maxSelfHP));
    
    // Exact inner coordinates to layer the red bar ON TOP of the black container slot
    const leftRectX = selfLeftX + 54;   
    const leftRectWidth = 232;          
    const leftRectHeight = 20;          
    const leftRectY = topY + 7;         

    // Draw red fill ON TOP of the asset container
    if (selfRatio > 0) {
        ctx.fillStyle = "#ff3b30"; 
        ctx.fillRect(leftRectX, leftRectY, selfRatio * leftRectWidth, leftRectHeight);
    }
    
    // Left Text Layout
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px sans-serif";
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 4;
    
    ctx.textAlign = "left";
    ctx.fillText(self.user.username, selfLeftX, topY - 15);
    
    ctx.textAlign = "center"; 
    ctx.fillText(`${Math.max(0, self.hp)}`, leftRectX + (leftRectWidth / 2), leftRectY + 16);
    ctx.shadowBlur = 0; 


    // --- 2. RIGHT PLAYER (OPPONENT) HEALTH BAR ---
    // Draw the texture asset frame background FIRST
    ctx.drawImage(hpBarImg, oppLeftX - 15, topY - 10, 330, 55);

    const oppRatio = Math.max(0, Math.min(1, opp.hp / maxOppHP));
    
    // Exact inner coordinates to layer the red bar ON TOP of the black container slot
    const rightRectX = oppLeftX + 54;   
    const rightRectWidth = 232;         
    const rightRectHeight = 20;
    const rightRectY = topY + 7;

    // Draw red fill ON TOP of the asset container
    if (oppRatio > 0) {
        ctx.fillStyle = "#ff3b30";
        ctx.fillRect(rightRectX, rightRectY, oppRatio * rightRectWidth, rightRectHeight);
    }
    
    // Right Text Layout
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px sans-serif";
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 4;
    
    ctx.textAlign = "right";
    ctx.fillText(opp.user.username, oppLeftX + 300, topY - 15);
    
    ctx.textAlign = "center";
    ctx.fillText(`${Math.max(0, opp.hp)}`, rightRectX + (rightRectWidth / 2), rightRectY + 16);
    ctx.shadowBlur = 0; 
}

// Handles drawing avatars and weapons during standard frames
function drawPlayer(ctx, swordImg, x, y, avatar, player, flipSword, avatarSize) {
    // Render Avatar with Isolated Circular Clipping Mask
    ctx.save(); 
    ctx.beginPath();
    ctx.arc(x + avatarSize / 2, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, x, y, avatarSize, avatarSize);
    ctx.restore(); 

    // Render Weapon Elements
    ctx.save();
    if (flipSword) {
        ctx.translate(x + 165, y + 165);
        ctx.scale(-1, 1);
        ctx.drawImage(swordImg, 0, -80, 120, 120);
    } else {
        ctx.drawImage(swordImg, x + 50, y + 80, 120, 120);
    }
    ctx.restore();
}

module.exports = {
    render,
};