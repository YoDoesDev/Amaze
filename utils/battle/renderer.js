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
    const hpWidth = 300;  // Width of the fillable bar area
    const hpHeight = 35;  // Height of the fillable bar area
    const topY = 50;      // Distance from top edge
    
    const selfLeftX = 60;                     // Upper Left Corner for Self
    const oppLeftX = canvasWidth - 60 - 300;  // Upper Right Corner for Opponent

    // --- LEFT PLAYER (SELF) HEALTH BAR ---
    // 1. Calculate health ratio safely (clamped between 0 and 1)
    const selfRatio = Math.max(0, Math.min(1, self.hp / maxSelfHP));
    
    // 2. Draw red filled bar FIRST (Underneath)
    ctx.fillStyle = "#ff3b30"; 
    ctx.fillRect(selfLeftX, topY, selfRatio * hpWidth, hpHeight);
    
    // 3. Draw the texture asset frame overlay NEXT (On Top)
    ctx.drawImage(hpBarImg, selfLeftX - 15, topY - 10, hpWidth + 30, hpHeight + 20);
    
    // 4. Crisp outer line border frame
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.strokeRect(selfLeftX, topY, hpWidth, hpHeight);
    
    // 5. Texts (Username & Metrics Layout)
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 4;
    
    ctx.textAlign = "left";
    ctx.fillText(self.user.username, selfLeftX, topY - 15);
    
    ctx.textAlign = "center";
    ctx.fillText(`${Math.max(0, self.hp)} / ${maxSelfHP}`, selfLeftX + (hpWidth / 2), topY + 26);
    ctx.shadowBlur = 0; // Reset canvas shadow context


    // --- RIGHT PLAYER (OPPONENT) HEALTH BAR ---
    // 1. Calculate health ratio safely (clamped between 0 and 1)
    const oppRatio = Math.max(0, Math.min(1, opp.hp / maxOppHP));
    
    // 2. Draw red filled bar FIRST (Underneath)
    ctx.fillStyle = "#ff3b30";
    ctx.fillRect(oppLeftX, topY, oppRatio * hpWidth, hpHeight);
    
    // 3. Draw the texture asset frame overlay NEXT (On Top)
    ctx.drawImage(hpBarImg, oppLeftX - 15, topY - 10, hpWidth + 30, hpHeight + 20);
    
    // 4. Stroke design layer frame
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.strokeRect(oppLeftX, topY, hpWidth, hpHeight);
    
    // 5. Metrics display mapping
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 4;
    
    ctx.textAlign = "right";
    ctx.fillText(opp.user.username, oppLeftX + hpWidth, topY - 15);
    
    ctx.textAlign = "center";
    ctx.fillText(`${Math.max(0, opp.hp)} / ${maxOppHP}`, oppLeftX + (hpWidth / 2), topY + 26);
    ctx.shadowBlur = 0; // Reset canvas shadow context
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