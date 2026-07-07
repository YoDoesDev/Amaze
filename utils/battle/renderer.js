const {
    createCanvas,
    loadImage,
} = require("@napi-rs/canvas");

const {
    AttachmentBuilder,
} = require("discord.js");

const path = require("path");

const background = path.join(__dirname, "..", "assets", "battle", "background.png");
const healthBar = path.join(__dirname, "..", "assets", "battle", "healthBar.png");
const sword = path.join(__dirname, "..", "assets", "battle", "sword.png");
const cloud = path.join(__dirname, "..", "assets", "battle", "fightingCloud.png");

async function render(self, opp, stage, maxSelfHP, maxOppHP) {
    const canvas = createCanvas(1280, 720);
    const ctx = canvas.getContext("2d");

    const bg = await loadImage(background);
    const hpBar = await loadImage(healthBar);
    const swordImg = await loadImage(sword);
    const cloudImg = await loadImage(cloud);

    const selfAvatar = await loadImage(
        self.user.displayAvatarURL({
            extension: "png",
            size: 512,
        })
    );

    const oppAvatar = await loadImage(
        opp.user.displayAvatarURL({
            extension: "png",
            size: 512,
        })
    );

    // 1. Draw the Background Arena
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    // 2. Global UI: Render Upper Corner Health Bars (Visible in ALL stages, including mid-fight)
    drawTopUI(ctx, hpBar, self, opp, maxSelfHP, maxOppHP, canvas.width);

    const leftX = 220;
    const rightX = 860;
    const y = 260;
    const avatarSize = 170;

    // 3. Stage Rendering Logic
    if (stage === 2) {
        // Mid-fight: Draw the cartoon cloud over the player areas
        ctx.drawImage(cloudImg, 350, 120, 580, 430);
    } else {
        // Stage 1 (Intro/Turns) or Stage 3 (Result)
        drawPlayer(ctx, swordImg, leftX, y, selfAvatar, self, false, avatarSize);
        drawPlayer(ctx, swordImg, rightX, y, oppAvatar, opp, true, avatarSize);

        if (stage === 3) {
            const loser = self.hp <= 0 ? "left" : "right";

            ctx.save();
            if (loser === "left") {
                ctx.translate(leftX + avatarSize / 2, y + avatarSize / 2 + 60);
                ctx.rotate(-Math.PI / 2);
                ctx.drawImage(selfAvatar, -avatarSize / 2, -avatarSize / 2, avatarSize, avatarSize);
            } else {
                ctx.translate(rightX + avatarSize / 2, y + avatarSize / 2 + 60);
                ctx.rotate(Math.PI / 2);
                ctx.drawImage(oppAvatar, -avatarSize / 2, -avatarSize / 2, avatarSize, avatarSize);
            }
            ctx.restore();
        }
    }

    return new AttachmentBuilder(canvas.toBuffer("image/png"), {
        name: "battle.png",
    });
}

// Dedicated function for Top Header Health Status UI
function drawTopUI(ctx, hpBarImg, self, opp, maxSelfHP, maxOppHP, canvasWidth) {
    const hpWidth = 300;  // Slightly wider bar for the top header look
    const hpHeight = 35;  // Slightly thicker bar
    const topY = 40;      // Distance from top edge
    
    const selfLeftX = 50;                     // Upper Left Corner for Self
    const oppLeftX = canvasWidth - 50 - 300;  // Upper Right Corner for Opponent (width adjusted)

    // --- LEFT PLAYER (SELF) HEALTH BAR ---
    ctx.drawImage(hpBarImg, selfLeftX - 15, topY - 10, hpWidth + 30, hpHeight + 20);
    const selfRatio = Math.max(0, self.hp) / maxSelfHP;
    ctx.fillStyle = "#32d74b";
    ctx.fillRect(selfLeftX, topY, selfRatio * hpWidth, hpHeight);
    
    // Border & Text
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.strokeRect(selfLeftX, topY, hpWidth, hpHeight);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(self.user.username, selfLeftX, topY - 15);
    ctx.textAlign = "center";
    ctx.fillText(`${Math.max(0, self.hp)}/${maxSelfHP}`, selfLeftX + (hpWidth / 2), topY + 26);

    // --- RIGHT PLAYER (OPPONENT) HEALTH BAR ---
    ctx.drawImage(hpBarImg, oppLeftX - 15, topY - 10, hpWidth + 30, hpHeight + 20);
    const oppRatio = Math.max(0, opp.hp) / maxOppHP;
    ctx.fillStyle = "#32d74b";
    ctx.fillRect(oppLeftX, topY, oppRatio * hpWidth, hpHeight);
    
    // Border & Text
    ctx.strokeRect(oppLeftX, topY, hpWidth, hpHeight);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "right";
    ctx.fillText(opp.user.username, oppLeftX + hpWidth, topY - 15);
    ctx.textAlign = "center";
    ctx.fillText(`${Math.max(0, opp.hp)}/${maxOppHP}`, oppLeftX + (hpWidth / 2), topY + 26);
}

// Handles drawing avatars and weapons during standard frames
function drawPlayer(ctx, swordImg, x, y, avatar, player, flipSword, avatarSize) {
    // 1. Render Avatar with Isolated Circular Clipping Mask
    ctx.save(); 
    ctx.beginPath();
    ctx.arc(x + avatarSize / 2, y + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, x, y, avatarSize, avatarSize);
    ctx.restore(); // Completely clears the clip mask so it doesn't break other drawings

    // 2. Render Weapon Elements
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
