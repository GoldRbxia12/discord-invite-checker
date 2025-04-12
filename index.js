const fs = require('fs');
const axios = require('axios');
const CONFIG_FILE = 'config.json';
const INPUT_FILE = 'invites.txt';
const EXCLUDED_FILE = 'excluded.txt';
const OUTPUT_FILE = 'output.txt';

const spinnerChars = ['|', '/', '-', '\\'];
const asciiArt = `
██╗███╗   ██╗██╗   ██╗     ██████╗██╗  ██╗██╗  ██╗
██║████╗  ██║██║   ██║    ██╔════╝██║  ██║██║ ██╔╝
██║██╔██╗ ██║██║   ██║    ██║     ███████║█████╔╝ 
██║██║╚██╗██║╚██╗ ██╔╝    ██║     ██╔══██║██╔═██╗ 
██║██║ ╚████║ ╚████╔╝     ╚██████╗██║  ██║██║  ██╗
╚═╝╚═╝  ╚═══╝  ╚═══╝       ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝
                                            by GoldRbxia
`;

async function fetchInviteDetails(inviteCode) {
    try {
        const response = await axios.get(`https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`);
        return response.data;
    } catch (error) {
        return null;
    }
}
function updateLog(index, total, duplicateCount, excludedCount, validCount, matchedCount, spinnerIndex) {
    const spinner = spinnerChars[spinnerIndex % spinnerChars.length];
    process.stdout.write(
        `\r${spinner} Invite: ${index}/${total} checking | Duplicate: ${duplicateCount} | Excluded: ${excludedCount} | Valid: ${validCount} | Matched: ${matchedCount} `
    );
}
async function checkInvites() {
    console.log(asciiArt);

    if (!fs.existsSync(CONFIG_FILE)) {
        console.error(`Config file "${CONFIG_FILE}" not found!`);
        return;
    }
    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`File "${INPUT_FILE}" not found!`);
        return;
    }
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    const inviteCodes = fs.readFileSync(INPUT_FILE, 'utf-8')
        .split('\n')
        .map(code => code.trim())
        .filter(code => code.length > 0);

    const excludedCodes = fs.existsSync(EXCLUDED_FILE)
        ? fs.readFileSync(EXCLUDED_FILE, 'utf-8')
              .split('\n')
              .map(code => code.trim())
              .filter(code => code.length > 0)
        : [];

    const uniqueCodes = [...new Set(inviteCodes)];
    const excludedSet = new Set(excludedCodes);
    const filteredCodes = uniqueCodes.filter(code => {
        if (excludedSet.has(code)) {
        //  console.log(`Excluded invite: ${code}`);
            return false;
        }
        return true;
    });
     const totalInvites = filteredCodes.length;
    const duplicateCount = inviteCodes.length - uniqueCodes.length;
    const excludedCount = uniqueCodes.length - filteredCodes.length;

    console.log(`Loaded ${inviteCodes.length} invites (${uniqueCodes.length} unique, ${excludedCount} excluded).`);

    let validInvites = [];
    let matchedCount = 0;

    for (let i = 0; i < totalInvites; i++) {
        const code = filteredCodes[i];

        updateLog(i + 1, totalInvites, duplicateCount, excludedCount, validInvites.length, matchedCount, i);

        const details = await fetchInviteDetails(code);

        if (!details) {
            continue;
        }

        const { approximate_member_count, approximate_presence_count, guild } = details;
        const boostCount = guild.premium_subscription_count || 0;

        if (boostCount >= config.minBoost &&
            approximate_presence_count >= config.minOnlineMembers &&
            approximate_member_count >= config.minMembers &&
            approximate_member_count <= config.maxMembers) {
            validInvites.push(code);
            matchedCount++;
        }
    }
 updateLog(totalInvites, totalInvites, duplicateCount, excludedCount, validInvites.length, matchedCount, 0);
    process.stdout.write('\n');

        fs.writeFileSync(OUTPUT_FILE, validInvites.join('\n'), 'utf-8');
    console.log(`Saved ${matchedCount} valid invites to "${OUTPUT_FILE}".`);
}

checkInvites()
    .catch(error => {
        console.error('An error occurred:', error.message);
    });
