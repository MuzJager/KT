const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = 3000;

// Имя файла для базы данных
const DB_FILE = path.join(__dirname, 'urls.json');

// Функции для работы с базой данных
function loadDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function saveDatabase(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 4));
}

// Функция для генерации уникального короткого URL
function generateShortUrl() {
    return crypto.randomBytes(4).toString('hex'); // Генерация 8 символов
}

// Настройка парсинга данных из форм и JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Маршрут для создания короткого URL
app.post('/create', (req, res) => {
    const originalUrl = req.body.url;

    if (!originalUrl) {
        return res.status(400).send('Не указан оригинальный URL');
    }

    const db = loadDatabase();
    const existingEntry = db.find((item) => item.original_url === originalUrl);

    // Проверка, если URL уже сокращён
    if (existingEntry) {
        return res.send(`
            <h1>Ссылка уже сокращена:</h1>
            <a href="/${existingEntry.short_url}" target="_blank">/${existingEntry.short_url}</a> -> ${existingEntry.original_url}
            <br><a href="/">Создать другую ссылку</a>
        `);
    }

    const shortUrl = generateShortUrl();
    db.push({ original_url: originalUrl, short_url: shortUrl });
    saveDatabase(db);

    res.send(`
        <h1>Ссылка успешно сокращена:</h1>
        <a href="/${shortUrl}" target="_blank">/${shortUrl}</a> -> ${originalUrl}
        <br><a href="/">Создать другую ссылку</a>
    `);
});

// Маршрут для переадресации по сокращённому URL
app.get('/:shortUrl', (req, res) => {
    const shortUrl = req.params.shortUrl;
    const db = loadDatabase();

    const entry = db.find((item) => item.short_url === shortUrl);
    if (entry) {
        res.redirect(entry.original_url);
    } else {
        res.status(404).send('<h1>Сокращённый URL не найден</h1><a href="/">Вернуться на главную</a>');
    }
});

// Главная страница с формой для сокращения URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Маршрут для отображения всех сокращённых ссылок
app.get('/urls', (req, res) => {
    const db = loadDatabase();

    if (db.length === 0) {
        return res.send('<h1>Сокращённые ссылки отсутствуют</h1><a href="/">Создать новую ссылку</a>');
    }

    const links = db.map((item) => `
        <li><a href="/${item.short_url}" target="_blank">/${item.short_url}</a> -> ${item.original_url}</li>
    `).join('');

    res.send(`
        <h1>Все сокращённые ссылки:</h1>
        <ul>${links}</ul>
        <br><a href="/">Создать сокращённую ссылку</a>
    `);
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Сервер работает на http://localhost:${port}`);
});
