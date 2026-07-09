function drawTopUI(ctx, hpBarImg, self, opp, maxSelfHP, maxOppHP, canvasWidth, stage) {
    const topY = 50;      // Distance from top edge

    const selfLeftX = 60;                     // Upper Left Corner for Self asset
    const oppLeftX = canvasWidth - 60 - 300;  // Upper Right Corner for Opponent asset

    // --- DEFENSIVE SAFEGUARDS AGAINST NaN ---
    const safeMaxSelf = maxSelfHP;
    const safeMaxOpp = maxOppHP;

    // --- HARDCODED PRECISE BOX SIZES ---
    const rectWidth = 232;          
    const rectHeight = 20;          
    const rectY = topY + 7;         
    const leftRectX = selfLeftX + 54;   
    const rightRectX = oppLeftX + 54;

    // --- DETERMINE RATIOS AND DISPLAY VALUES DYNAMICALLY ---
    let selfRatio, oppRatio;
    let displaySelfHp, displayOppHp;

    if (stage === 3) {
        // Result phase check
        selfRatio = self.hp <= 0 ? 0 : 1.0;
        oppRatio = self.hp <= 0 ? 1.0 : 0;
        displaySelfHp = self.hp <= 0 ? 0 : safeMaxSelf;
        displayOppHp = self.hp <= 0 ? safeMaxOpp : 0;
    } else {
        // FIX: Both Stage 1 (intro) AND Stage 2 (mid-fight loop) now display actual background metrics!
        selfRatio = Math.max(0, Math.min(1, self.hp / safeMaxSelf));
        oppRatio = Math.max(0, Math.min(1, opp.hp / safeMaxOpp));
        displaySelfHp = Math.max(0, self.hp);
        displayOppHp = Math.max(0, opp.hp);
    }

    // --- 1. LEFT PLAYER (SELF) HEALTH BAR ---
    ctx.drawImage(hpBarImg, selfLeftX - 15, topY - 10, 330, 55);

    if (selfRatio > 0) {
        ctx.fillStyle = "#ff3b30"; 
        ctx.fillRect(leftRectX, rectY, selfRatio * rectWidth, rectHeight);
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px sans-serif";
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 4;

    ctx.textAlign = "left";
    ctx.fillText(self.user.username, selfLeftX, topY - 15);

    ctx.textAlign = "center"; 
    ctx.fillText(`${displaySelfHp} / ${safeMaxSelf}`, leftRectX + (rectWidth / 2), rectY + 16);
    ctx.shadowBlur = 0; 


    // --- 2. RIGHT PLAYER (OPPONENT) HEALTH BAR ---
    ctx.drawImage(hpBarImg, oppLeftX - 15, topY - 10, 330, 55);

    if (oppRatio > 0) {
        ctx.fillStyle = "#ff3b30";
        ctx.fillRect(rightRectX, rectY, oppRatio * rectWidth, rectHeight);
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px sans-serif";
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 4;

    ctx.textAlign = "right";
    ctx.fillText(opp.user.username, oppLeftX + 300, topY - 15);

    ctx.textAlign = "center";
    ctx.fillText(`${displayOppHp} / ${safeMaxOpp}`, rightRectX + (rectWidth / 2), rectY + 16);
    ctx.shadowBlur = 0; 
}
