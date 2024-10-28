require('dotenv').config();
const puppeteer = require('puppeteer');
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel]
});

const token = process.env.DISCORD_TOKEN;
const channelId = process.env.CHANNEL_ID;

// Biến để lưu tiêu đề meme cuối cùng đã gửi
let lastMemeTitle = null;

// Hàm lấy danh sách meme từ trang web
async function fetchMemeList() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Mở trang và chờ nội dung tải xong
    await page.goto('https://xabuon.com/', { waitUntil: 'networkidle2' });

    // Đợi các phần tử được thêm vào bởi JavaScript
    const memes = await page.evaluate(() => {
        const memeElements = document.querySelectorAll('#entries-content-ul .gag-link');
        const memeList = [];

        memeElements.forEach((element) => {
            const title = element.querySelector('.jump_focus').innerText.trim();
            const link = element.querySelector('.jump_focus').href;
            const imageUrl = element.querySelector('.img-wrap img')?.src;
            const author = element.querySelector('.uinfo a').innerText.trim();
            const views = element.querySelector('.views1')?.innerText.replace('lượt xem:', '').trim();

            memeList.push({ title, link, imageUrl, author, views });
        });

        return memeList;
    });

    await browser.close();
    return memes;
}

// Hàm gửi meme vào kênh nếu có meme mới
async function postMemeToChannel() {
    const memes = await fetchMemeList();
    if (memes && memes.length > 0) {
        const latestMeme = memes[0];
        
        // Kiểm tra nếu meme mới nhất chưa được gửi
        if (latestMeme.title !== lastMemeTitle) {
            const memeEmbed = new EmbedBuilder()
                .setTitle(latestMeme.title)
                .setImage(latestMeme.imageUrl)
                .setURL(latestMeme.link)
                .setColor('#0099ff')
                .setFooter({ text: `Bởi ${latestMeme.author} | ${latestMeme.views} lượt xem` });

            const channel = client.channels.cache.get(channelId);
            if (channel) {
                channel.send({ embeds: [memeEmbed] });
                // Cập nhật lastMemeTitle để tránh gửi trùng
                lastMemeTitle = latestMeme.title;
            } else {
                console.error('Channel not found');
            }
        }
    }
}

// Sự kiện bot khởi động và kiểm tra meme mới mỗi 10 phút
client.once('ready', () => {
    console.log('Bot is online!');
    
    postMemeToChannel();
    setInterval(postMemeToChannel, 12 * 60 * 60 * 1000); 
});

client.login(token);
