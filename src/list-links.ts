import axios from 'axios';
import * as cheerio from 'cheerio';

async function listLinks() {
    const url = 'https://help.forcepoint.com';
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        console.log('Page Title:', $('title').text());
        
        $('a').each((_, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href) {
                console.log(`Text: ${text} | Href: ${href}`);
            }
        });
    } catch (error: any) {
        console.error('Error fetching page:', error.message);
    }
}

listLinks();
