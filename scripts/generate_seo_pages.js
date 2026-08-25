const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');

function replaceSeoContent(html, replacements) {
    let result = html;
    for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(key, 'g');
        result = result.replace(regex, value);
    }
    return result;
}

const pages = [
    {
        source: 'birthday-wishes-website.html',
        target: 'birthday-wishes-for-best-friend.html',
        replacements: {
            '<title>Free Birthday Wish Website Maker \\| TheGreeter</title>': '<title>Birthday Wishes for Best Friend Website Maker | Free | TheGreeter</title>',
            'content="Create a free personalized birthday wish website in 60 seconds with cake cutting, popping balloons, music, and custom messages."': 'content="Create an unforgettable birthday wish website for your best friend. Add inside jokes, custom photos, and favorite music in 60 seconds."',
            'content="birthday wish website maker, free birthday surprise website, create online birthday greeting card, interactive birthday wish link, birthday website generator"': 'content="birthday wishes for best friend, best friend birthday website, surprise best friend birthday link, birthday wish maker for friend"',
            'href="https://thegreeter.in/birthday-wishes-website"': 'href="https://thegreeter.in/birthday-wishes-for-best-friend"',
            'content="https://thegreeter.in/birthday-wishes-website"': 'content="https://thegreeter.in/birthday-wishes-for-best-friend"',
            '"url": "https://thegreeter.in/birthday-wishes-website"': '"url": "https://thegreeter.in/birthday-wishes-for-best-friend"',
            'Create a Free Animated Birthday Wish Website in 60 Seconds': 'Create the Ultimate Birthday Surprise Website for Your Best Friend',
            'Surprise your friends, family, or partner with a custom interactive birthday website.': 'Show your bestie how much they mean to you with a custom interactive birthday website. Fill it with inside jokes and memories.',
            'Why Traditional Paper Birthday Cards Are Changing to Digital Surprise Websites': 'Why a Digital Birthday Page is the Perfect Gift for Your Best Friend'
        }
    },
    {
        source: 'birthday-wishes-website.html',
        target: 'birthday-wishes-for-husband.html',
        replacements: {
            '<title>Free Birthday Wish Website Maker \\| TheGreeter</title>': '<title>Romantic Birthday Wishes for Husband | Custom Website Maker</title>',
            'content="Create a free personalized birthday wish website in 60 seconds with cake cutting, popping balloons, music, and custom messages."': 'content="Surprise your husband with a romantic interactive birthday website. Add couple photos, a love letter, and his favorite song."',
            'content="birthday wish website maker, free birthday surprise website, create online birthday greeting card, interactive birthday wish link, birthday website generator"': 'content="birthday wishes for husband, romantic birthday surprise for husband, husband birthday website, birthday digital gift for him"',
            'href="https://thegreeter.in/birthday-wishes-website"': 'href="https://thegreeter.in/birthday-wishes-for-husband"',
            'content="https://thegreeter.in/birthday-wishes-website"': 'content="https://thegreeter.in/birthday-wishes-for-husband"',
            '"url": "https://thegreeter.in/birthday-wishes-website"': '"url": "https://thegreeter.in/birthday-wishes-for-husband"',
            'Create a Free Animated Birthday Wish Website in 60 Seconds': 'Create a Romantic Birthday Surprise Website for Your Husband',
            'Surprise your friends, family, or partner with a custom interactive birthday website.': 'Make your husband feel truly special with a personalized birthday website featuring your romantic memories and love notes.',
            'Why Traditional Paper Birthday Cards Are Changing to Digital Surprise Websites': 'Why a Digital Surprise is the Best Birthday Gift for Your Husband'
        }
    },
    {
        source: 'birthday-wishes-website.html',
        target: 'birthday-wishes-for-wife.html',
        replacements: {
            '<title>Free Birthday Wish Website Maker \\| TheGreeter</title>': '<title>Heart-touching Birthday Wishes for Wife | Website Generator</title>',
            'content="Create a free personalized birthday wish website in 60 seconds with cake cutting, popping balloons, music, and custom messages."': 'content="Melt your wife\'s heart with a beautiful custom birthday website. Include your favorite photos together and a heartfelt love message."',
            'content="birthday wish website maker, free birthday surprise website, create online birthday greeting card, interactive birthday wish link, birthday website generator"': 'content="birthday wishes for wife, birthday surprise for wife, romantic birthday website for wife, gift for wife online"',
            'href="https://thegreeter.in/birthday-wishes-website"': 'href="https://thegreeter.in/birthday-wishes-for-wife"',
            'content="https://thegreeter.in/birthday-wishes-website"': 'content="https://thegreeter.in/birthday-wishes-for-wife"',
            '"url": "https://thegreeter.in/birthday-wishes-website"': '"url": "https://thegreeter.in/birthday-wishes-for-wife"',
            'Create a Free Animated Birthday Wish Website in 60 Seconds': 'Create a Heart-touching Birthday Surprise Website for Your Wife',
            'Surprise your friends, family, or partner with a custom interactive birthday website.': 'Show your wife she means the world to you with a beautiful digital birthday surprise full of love, memories, and music.',
            'Why Traditional Paper Birthday Cards Are Changing to Digital Surprise Websites': 'Why a Personalized Web Page is the Most Romantic Gift for Your Wife'
        }
    },
    {
        source: 'anniversary-wishes-website.html',
        target: '1st-anniversary-wishes-website.html',
        replacements: {
            '<title>Free Anniversary Wish Website Maker \\| TheGreeter</title>': '<title>1st Anniversary Wishes & Romantic Surprise Website Maker</title>',
            'content="Create a romantic anniversary wishing website for free. Add photo memory galleries, love letters, and background music."': 'content="Celebrate your first 365 days together. Create a beautiful 1st anniversary website with your wedding photos and love story."',
            'content="anniversary wish website maker, free anniversary surprise website, romantic couple website generator, digital anniversary wish card, online anniversary greeting webpage"': 'content="1st anniversary wishes, first anniversary surprise, 1st anniversary website, paper anniversary digital gift, romantic 1 year anniversary"',
            'href="https://thegreeter.in/anniversary-wishes-website"': 'href="https://thegreeter.in/1st-anniversary-wishes-website"',
            'content="https://thegreeter.in/anniversary-wishes-website"': 'content="https://thegreeter.in/1st-anniversary-wishes-website"',
            '"url": "https://thegreeter.in/anniversary-wishes-website"': '"url": "https://thegreeter.in/1st-anniversary-wishes-website"',
            'Create a Romantic Anniversary Wish Website in 60 Seconds': 'Create a Beautiful 1st Anniversary Surprise Website in 60 Seconds',
            'Celebrate marriage & dating anniversaries with floating hearts, romantic music, photo timelines, and heartfelt love letters.': 'Celebrate your magical first year together with floating hearts, your wedding song, and a digital love letter.',
            'Transforming Anniversary Wishes Into Interactive Digital Keep-Sakes': 'Make Your 1st Anniversary Unforgettable with a Digital Keepsake'
        }
    },
    {
        source: 'festival-greetings-website.html',
        target: 'diwali-wishing-website-maker.html',
        replacements: {
            '<title>Free Festival Wish Website Maker \\| TheGreeter</title>': '<title>Free Happy Diwali Wishing Website Maker & Greetings 2026</title>',
            'content="Create free festival wish websites for Diwali, New Year, Christmas, and Eid with fireworks, sparklers, and music."': 'content="Send sparkling Diwali wishes online. Create a custom Happy Diwali interactive website with virtual firecrackers, diyas, and music."',
            'content="festival wish website maker, free festival greeting creator, Diwali online wishing portal, New Year digital greetings card, Christmas wish webpage generator"': 'content="diwali wishing website maker, happy diwali greetings online, create diwali wish link, diwali digital card with name, diwali fireworks website"',
            'href="https://thegreeter.in/festival-greetings-website"': 'href="https://thegreeter.in/diwali-wishing-website-maker"',
            'content="https://thegreeter.in/festival-greetings-website"': 'content="https://thegreeter.in/diwali-wishing-website-maker"',
            '"url": "https://thegreeter.in/festival-greetings-website"': '"url": "https://thegreeter.in/diwali-wishing-website-maker"',
            'Create a Free Festival Wish Website in 60 Seconds': 'Create a Sparkling Happy Diwali Wishing Website in 60 Seconds',
            'Build interactive festival wish websites with fireworks, lights, music, and localized greetings.': 'Send personalized Diwali blessings to your family and friends with interactive fireworks, glowing diyas, and festive music.',
            'Spreading Festival Cheer Across Borders': 'Spreading the Light of Diwali Across Borders'
        }
    }
];

pages.forEach(page => {
    const sourcePath = path.join(publicDir, page.source);
    const targetPath = path.join(publicDir, page.target);
    
    if (fs.existsSync(sourcePath)) {
        const html = fs.readFileSync(sourcePath, 'utf8');
        const updatedHtml = replaceSeoContent(html, page.replacements);
        fs.writeFileSync(targetPath, updatedHtml, 'utf8');
        console.log(`Generated: ${page.target}`);
    } else {
        console.error(`Source not found: ${sourcePath}`);
    }
});
