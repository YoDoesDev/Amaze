const {
    createCanvas,
    loadImage,
} = require("canvas");

const {
    AttachmentBuilder,
} = require("discord.js");

const path = require("path");

const background = path.join(__dirname, "..", "assets", "battle", "background.png");
const healthBar = path.join(__dirname, "..", "assets", "battle", "healthBar.png");
const sword = path.join(__dirname, "..", "assets", "battle", "sword.png");
const cloud = path.join(__dirname, "..", "assets", "battle", "fightingCloud.png");

// Added maxSelfHP and maxOppHP parameters
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

    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    const leftX = 220;
    const rightX = 860;
    const y = 260;
    const avatarSize = 170;

    if (stage === 2) {
        ctx.drawImage(cloudImg, 350, 120, 580, 430);
    } else {
        // Passed specific maxHP values to each player
        drawPlayer(leftX, y, selfAvatar, self, false, maxSelfHP);
        drawPlayer(rightX, y, oppAvatar, opp, true, maxOppHP);

        if (stage === 3) {
            const loser = self.hp <= 0 ? "left" : "right";

            ctx.save();

            if (loser === "left") {
                ctx.translate(leftX + avatarSize / 2, y + avatarSize / 2 + 60);
                ctx.rotate(-Math.PI / 2);
                ctx.drawImage(
                    selfAvatar,
                    -avatarSize / 2,
                    -avatarSize / 2,
                    avatarSize,
                    avatarSize
                );
            } else {
                ctx.translate(rightX + avatarSize / 2, y + avatarSize / 2 + 60);
                ctx.rotate(Math.PI / 2);
                ctx.drawImage(
                    oppAvatar,
                    -avatarSize / 2,
                    -avatarSize / 2,
                    avatarSize,
                    avatarSize
                );
            }

            ctx.restore();
        }
    }

    return new AttachmentBuilder(canvas.toBuffer("image/png"), {
        name: "battle.png",
    });

    // Added maxHP to the drawPlayer arguments
    function drawPlayer(x, y, avatar, player, flipSword, maxHP) {
        const hpWidth = 220;
        const hpHeight = 28;

        ctx.drawImage(hpBar, x - 20, y - 90, 220, 40);

        // Health percentage calculation (Math.max handles negative hp states safely)
        const hpRatio = Math.max(0, player.hp) / maxHP;

        ctx.fillStyle = "#32d74b";
        ctx.fillRect(
            x - 8,
            y - 78,
            hpRatio * hpWidth, // Scale bar width perfectly by percentage ratio
            hpHeight
        );

        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 8, y - 78, hpWidth, hpHeight);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
            `${Math.max(0, player.hp)}/${maxHP}`, // Keeps it from showing negative numbers on knockouts
            x + 100,
            y - 56
        );

        ctx.save();

        ctx.beginPath();
        ctx.arc(
            x + avatarSize / 2,
            y + avatarSize / 2,
            avatarSize / 2,
            0,
            Math.PI * 2
        );
        ctx.closePath();
        ctx.clip();

        ctx.drawImage(
            avatar,
            x,
            y,
            avatarSize,
            avatarSize
        );

        ctx.restore();

        ctx.save();

        if (flipSword) {
            ctx.translate(x + 165, y + 165);
            ctx.scale(-1, 1);
            ctx.drawImage(
                swordImg,
                0,
                -80,
                120,
                120
            );
        } else {
            ctx.drawImage(
                swordImg,
                x + 50,
                y + 80,
                120,
                120
            );
        }

        ctx.restore();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
            player.user.username,
            x + avatarSize / 2,
            y + avatarSize + 40
        );
    }
}

module.exports = {
    render,
};
