const takeTurn = (player1, player2) => {
    const self = player1;
    const opp = player2;

    const first = self.spd > opp.spd ? self : opp;
    const second = self.spd > opp.spd ? opp : self;

    let speedDiff = 0;
    let damage = 0;
    let dodgeChance = 0;

    // Speed diff check for first player to attack

    speedDiff = second.spd - first.spd;
    dodgeChance = Math.max(
        5,
        Math.min(40, 15 + speedDiff)
    );

    // First player attacks

    damage = Math.round(Math.random() * 100 < dodgeChance ? 0 : first.str * (100 / (100 + second.dma)));
    second.hp = second.hp - damage <= 0 ? 0 : second.hp - damage;

    // Check if second player is still alive
    if (second.hp <= 0) {
        first.xp += 100;
        second.xp += 10;
       return {
    result: `${first.user.username} has defeated ${second.user.username}!`,
    winner: first,
    loser: second,
};
    }

    // Speed diff check for second player to attack

    speedDiff = first.spd - second.spd;
    dodgeChance = Math.max(
        5,
        Math.min(40, 15 + speedDiff)
    );

    damage = Math.round(Math.random() * 100 < dodgeChance ? 0 : second.str * (100 / (100 + first.dma)));
    // Second player attacks
    first.hp = first.hp - damage <= 0 ? 0 : first.hp - damage;

    // Check if first player is still alive
    if (first.hp <= 0) {
        first.xp += 10;
        second.xp += 100;
        return {
    result: `${second.user.username} has defeated ${first.user.username}!`,
    winner: second,
    loser: first,
};
    }

    return {
        result: null,
        winner: null,
    };
}

module.exports = {
    takeTurn
};