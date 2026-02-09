import axios from 'axios';
import * as cheerio from 'cheerio';

async function testExtraction() {
    const url = 'https://help.forcepoint.com/dlp/10.4.0/dlphelp/index.html';
    console.log(`Fetching ${url}...`);
    
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        
        console.log('--- Page Title ---');
        console.log($('title').text());

        console.log('\n--- Navigation Tree Candidates ---');
        $('nav, .navigation, .toc, .sidebar, [role="navigation"]').each((i, el) => {
            console.log(`\nCandidate ${i} (${el.tagName}, class="${$(el).attr('class')}", id="${$(el).attr('id')}"):`);
            const links = $(el).find('a').length;
            console.log(`Contains ${links} links.`);
            if (links > 0) {
                 $(el).find('a').slice(0, 5).each((j, link) => {
                     console.log(`  - ${$(link).text().trim()} -> ${$(link).attr('href')}`);
                 });
            }
        });

        console.log('\n--- Main Content Candidates ---');
        $('main, [role="main"], .main-content, #main').each((i, el) => {
             console.log(`\nCandidate ${i} (${el.tagName}, class="${$(el).attr('class')}"):`);
             console.log($(el).text().substring(0, 200).replace(/\s+/g, ' ').trim() + '...');
        });

    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

testExtraction();