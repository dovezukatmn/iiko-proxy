const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Разрешаем CORS (чтобы ваш сайт мог обращаться к этому серверу)
app.use(cors());

// 2. Позволяем серверу понимать JSON, который приходит в запросах
app.use(express.json());

// Базовый URL API IIKO (Замените, если используете Transport API или другую версию)
const IIKO_BASE_URL = 'https://api-ru.iiko.net';

// === МАРШРУТ 1: Получение токена (Авторизация) ===
// Ваш сайт отправит запрос сюда, а этот сервер добавит скрытый логин и сходит в IIKO
app.post('/auth', async (req, res) => {
    try {
        // Мы берем логин из защищенных переменных окружения сервера (не видно в браузере)
        const apiLogin = process.env.IIKO_API_LOGIN;

        if (!apiLogin) {
            return res.status(500).json({ error: 'API Login не настроен на сервере' });
        }

        // Делаем запрос к IIKO
        const response = await axios.post(`${IIKO_BASE_URL}/api/1/auth/access_token`, {
            apiLogin: apiLogin
        });

        // Отправляем токен обратно вашему сайту
        res.json(response.data);

    } catch (error) {
        console.error('Ошибка авторизации:', error.message);
        res.status(500).json({ error: 'Ошибка при получении токена от IIKO' });
    }
});

// === МАРШРУТ 2: Универсальный прокси (для получения меню, заказов и т.д.) ===
// Пример вызова: ваш_сайт -> /proxy/api/1/organizations -> сервер IIKO
app.all('/proxy/*', async (req, res) => {
    const urlPath = req.params[0]; // Берем всё, что написано после /proxy/
    const targetUrl = `${IIKO_BASE_URL}/${urlPath}`;
    
    try {
        const response = await axios({
            method: req.method,
            url: targetUrl,
            data: req.body, // Пересылаем тело запроса
            headers: {
                // Пересылаем заголовок авторизации (токен), если он есть
                'Authorization': req.headers['authorization']
            }
        });
        
        res.json(response.data);
    } catch (error) {
        // Если IIKO вернул ошибку, передаем её на фронтенд
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});