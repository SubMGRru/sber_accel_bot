require('dotenv').config();

var Promise = require('promise');

const TelegramBot = require('node-telegram-bot-api');

const util = require('minecraft-server-util');

const mysql = require("mysql2");

const connection = mysql.createConnection({
    host: "panel.moonminecraft.site",
    port: 3306,
    user: "u9_FTpG0fMWOC",
    database: "s9_telegramBot",
    password: "AKjhBa=W.J8.EFB@LVH+Zqd1"
});
connection.connect(function(err) {
    if (err) {
        return console.error("MYSQL ERROR: " + err.message);
    } else {
        console.log("[Load] MySQL connection is established successfully. Now I'm online!");
    }
});
// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(process.env.token, {
    polling: true
});

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (!msg.text.includes("/") || msg.text.includes("/start")) {
        // send a message to the chat acknowledging receipt of their message
        bot.sendMessage(msg.chat.id, `Привет! Я — бот Minecraft сервера Сбер.Акселератора. Моя задача состоит в том, чтобы помочь тебе начать игру. 
        \nОбязательное условие для проходки на сервер — являться участником чата Sber\`22 или SberStudent\`22.`, {
            'reply_markup': {
                inline_keyboard: [
                    [{
                        text: 'Уже вступил',
                        callback_data: 'joined_already'
                    }, {
                        text: 'Еще не вступил',
                        callback_data: 'not_joined_yet'
                    }],
                    [{
                        text: 'Статистика',
                        callback_data: 'statistics'
                    }, {
                        text: 'Поддержка',
                        callback_data: 'support'
                    }]
                ]
            }
        });
    } else {
        //nothing
        if (msg.text.includes("/get_bedrock")) {
            var gamertag = msg.text.split(' ')[1];
            (async() => {
                var result = await check_if_verified_and_added(chatId);
                if (gamertag === undefined) {
                    bot.sendMessage(
                        chatId,
                        'Вы забыли указать игровое имя. Попробуйте еще раз!',
                    );
                    return;
                } else if (result[0].is_verified != "yes") {
                    bot.sendMessage(
                        chatId,
                        'Вы используете эту команду слишком рано, вначале нужно пройти верификацию. Начните сначала и изучите инструкции: /start',
                    );
                } else if (result[0].bedrock_name != null) {
                    bot.sendMessage(
                        chatId,
                        'Вы уже добавили себя в список гостей для платформы Bedrock. \nУ нас правило: 1 участник - 1 проходка на каждую из платформ (Java, Bedrock) для игры на сервере. \nЕсли Вы хотите сбросить имя пользователя для игры, используйте команду /reset_bedrock. Это удалит прошлое имя из списка гостей сервера, однако, это позволит Вам добавить другое имя в список гостей.',
                    );
                } else {
                    complete_whitelist(chatId, "bedrock", gamertag, "add")
                };
            })();

        } else if (msg.text.includes("/get_java")) {
            const gamertag = msg.text.split(' ')[1];
            (async() => {
                const result = await check_if_verified_and_added(chatId);
                if (gamertag === undefined) {
                    bot.sendMessage(
                        chatId,
                        'Вы забыли указать игровое имя. Попробуйте еще раз!',
                    );
                    return;
                } else if (result[0] == undefined) {
                    bot.sendMessage(
                        chatId,
                        'Вы должны пройти с самого начала, чтобы использовать эту команду.\nНачните сначала и изучите инструкции: /start',
                    );
                } else if (result[0].is_verified != "yes") {
                    bot.sendMessage(
                        chatId,
                        'Вы используете эту команду слишком рано, вначале нужно пройти верификацию. Начните сначала и изучите инструкции: /start',
                    );
                } else if (result[0].java_name != null) {
                    bot.sendMessage(
                        chatId,
                        'Вы уже добавили себя в список гостей для платформы Java. \nУ нас правило: 1 участник - 1 проходка на каждую из платформ (Java, Bedrock) для игры на сервере. \nЕсли Вы хотите сбросить имя пользователя для игры, используйте команду /reset_java. Это удалит прошлое имя из списка гостей сервера, однако, это позволит Вам добавить другое имя в список гостей.',
                    );
                } else {
                    complete_whitelist(chatId, "java", gamertag, "add")
                };
            })();
        } else if (msg.text.includes("/reset_bedrock")) {
            bot.sendMessage(chatId, 'Вы удалили себя из списка гостей для платформы Bedrock. \nТеперь Вы можете добавить другое игровое имя в список гостей, для этого используйте:\n\n `/get_bedrock `<игровое имя>.', {
                parse_mode: 'Markdown'
            });
            complete_whitelist(chatId, "bedrock", null, "delete")
        } else if (msg.text.includes("/reset_java")) {
            bot.sendMessage(chatId, 'Вы удалили себя из списка гостей для платформы Java. \nТеперь Вы можете добавить другое игровое имя в список гостей, для этого используйте:\n\n `/get_java `<игровое имя>.', {
                parse_mode: 'Markdown'
            });
            complete_whitelist(chatId, "java", null, "delete")
        } else {
            bot.sendMessage(chatId, 'Received your message, but I cannot understand which command you want to execute: no such command;\n\nКоманда не найдена, проверьте, правильно ли Вы ввели ее.');
        }
    }
});

bot.on('callback_query', (callbackQuery) => {
    const message = callbackQuery.message;
    const data_btn = callbackQuery.data;
    var chatId = callbackQuery.from.id;

    if (data_btn == "not_joined_yet") {
        bot.sendMessage(message.chat.id, `Время это исправить! Чтобы вступить в коммьюнити чаты Акселератора, нужно стать зарегистрироваться на Акселератор.\nАкселератор Сбера - это отличная возможность попробовать себя в предпринимательской деятельности, даже если ранее Вы этим никогда не занимались! В конце Вы придумаете и реализуете свой бизнес проект, а так же, вероятно, представите его на демодне.\nДля школьников и СПО: линк\nДля студентов: линк\nЕсли Вы уже зарегистрировались, но не попали в чат, то перейдите на платформу (https://newschool.sberclass.ru/), войдите в аккаунт и обратите внимание на желтую плашку с ссылкой.`);
    } else if (data_btn == "joined_already") {
        bot.getChatMember(process.env.requireVerification_chat1, chatId).then((data) => {
            got_verified(message.chat.id)
        }).catch((e) => {
            if (e.response.body.error_code == 400) {
                bot.getChatMember(process.env.requireVerification_chat2, chatId).then((data) => {
                    console.log(data);
                    got_verified(message.chat.id);
                }).catch((e) => {
                    if (e.response.body.error_code == 400) {
                        bot.sendMessage(message.chat.id, `Я искал Вас сразу во всех чатах Акселератора, но нигде не нашел. \n\nЧтобы вступить в коммьюнити чаты Акселератора, нужно стать зарегистрироваться на Акселератор.\nАкселератор Сбера - это отличная возможность попробовать себя в предпринимательской деятельности, даже если ранее Вы этим никогда не занимались! В конце Вы придумаете и реализуете свой бизнес проект, а так же, вероятно, представите его на демодне.\nДля школьников и СПО: https://vk.cc/caQFxx\nДля студентов: https://vk.cc/caQFAC\nЕсли Вы уже зарегистрировались, но не попали в чат, то перейдите на платформу (https://newschool.sberclass.ru/), войдите в аккаунт и обратите внимание на желтую плашку с ссылкой.\n\nДавайте попробуем еще раз:`, {
                            'reply_markup': {
                                inline_keyboard: [
                                    [{
                                        text: 'Уже вступил',
                                        callback_data: 'joined_already'
                                    }, {
                                        text: 'Еще не вступил',
                                        callback_data: 'not_joined_yet'
                                    }]
                                ]
                            }
                        });
                    }
                });
            }
        });
    } else if (data_btn == "statistics") {
        bot.sendMessage(message.chat.id, `Ошибка получения статистики: ERR400`);
    } else if (data_btn == "support") {
        bot.sendMessage(message.chat.id, `Есть вопросы или предложения по серверу? Рады помочь!\n\nВ Telegram: @aramtop\nпо почте: support@deqstudio.com`);
    }
});

async function got_verified(userid) {
    var account_result = await check_if_verified_and_added(userid);
    if (account_result[0] == undefined) {
        connection.query("INSERT INTO data(tg_id) VALUES(?)", [userid], function(err, results) {
            if (err) console.log(err);
            else {
                bot.sendMessage(userid, `Я запросто нашел тебя в чатике, так держать! Теперь давай настроим проходку на твое игровое имя.
        \nИспользуй команды в следующем формате, в зависимости от платформы, на которой ты играешь:
        \n\`/get_bedrock \`<игровое имя> — если вы играете на платформе Bedrock.
        \n\`/get_java \`<игровое имя> — если вы играете на платформе Java.`, {
                    parse_mode: 'Markdown'
                });
                console.log("[New Event] New successfull Verification for user " + userid)
            };
        });
    } else {
        bot.sendMessage(userid, `Теперь настроим проходку на твое игровое имя.
        \nИспользуй команды в следующем формате, в зависимости от платформы, на которой ты играешь:
        \n\`/get_bedrock \`<игровое имя> — если вы играете на платформе Bedrock.
        \n\`/get_java \`<игровое имя> — если вы играете на платформе Java.`, {
            parse_mode: 'Markdown'
        });
    }

}

function check_if_verified_and_added(tg_id, platform) {
    var data_for_update = [tg_id];
    var sql = "SELECT * FROM data WHERE tg_id = ?";

    return new Promise((resolve, reject) => {
        connection.query(sql, data_for_update, function(err, results) {
            if (err) console.log(err);
            else {
                resolve(results);
            };
        });
    });
}


function complete_whitelist(chatId, platform, gamertag, action_type) {
    var gamertag_forQuery = gamertag;
    var not_modificated_gamertag = gamertag;
    if (platform == "bedrock") {
        gamertag_forQuery = "." + gamertag_forQuery;
    }
    const client = new util.RCON();

    const connectOpts = {
        timeout: 1000 * 5
            // ... any other connection options specified by
            // NetConnectOpts in the built-in `net` Node.js module
    };

    const loginOpts = {
        timeout: 1000 * 5
    };
    (async() => {

        await client.connect(process.env.server1_ip, process.env.server1_rcon_port, connectOpts);
        await client.login(process.env.server1_rcon_password, loginOpts);

        var account_result = await check_if_verified_and_added(chatId);

        if (action_type == "add") {
            var message1 = await client.execute('easywl add ' + gamertag_forQuery);
        } else if (action_type == "delete") {
            if (platform == "bedrock") {
                gamertag_forQuery = "." + account_result[0].bedrock_name;
            } else if (platform == "java") {
                gamertag_forQuery = account_result[0].java_name;
            }
            var message1 = await client.execute('easywl remove ' + gamertag_forQuery);
        }

        await client.close();

        await client.connect(process.env.server2_ip, process.env.server2_rcon_port, connectOpts);
        await client.login(process.env.server2_rcon_password, loginOpts);

        if (action_type == "add") {
            var msg_whitelist_act = "Сервер принял изменения, вы добавлены в список разрешенных гостей."
            var message2 = await client.execute('easywl add ' + gamertag_forQuery);
            var data_for_update = [not_modificated_gamertag, chatId];
        } else if (action_type == "delete") {
            var msg_whitelist_act = "Сервер принял изменения, вы были удалены из списка разрешенных гостей."
            var message2 = await client.execute('easywl remove ' + gamertag_forQuery);
            var data_for_update = [null, chatId];
        }

        //console.log("[S1]: " + message1);
        //console.log("[S2]: " + message2);

        await client.close();
        //
        var data_for_update = [not_modificated_gamertag, chatId];


        if (platform == "java") {
            var sql = "UPDATE data SET java_name = ? WHERE tg_id = ?";
            gamertag_forQuery = account_result[0].java_name;
        } else if (platform == "bedrock") {
            var sql = "UPDATE data SET bedrock_name = ? WHERE tg_id = ?";
            gamertag_forQuery = "." + account_result[0].bedrock_name;
        }

        connection.query(sql, data_for_update, function(err, results) {
            if (err) console.log(err);
            else {
                console.log("[New Event] Whitelist " + action_type + " for gamertag " + gamertag_forQuery + "on " + platform + " platform.")
                bot.sendMessage(chatId, msg_whitelist_act);
                if (action_type == "add") {
                    sendmsg_howtojoin(chatId, platform);
                }

            };
        });
        //
    })();

}

function sendmsg_howtojoin(chatId, platform) {
    if (platform == "bedrock") {
        bot.sendMessage(chatId, "Добро пожаловать! \n\nIP: `sber.deqstudio.com` \nPort: `19132` \nНазвание сервера: любое \n\nИнструкция по подключению:", {
            parse_mode: 'Markdown'
        });
    } else if (platform == "java") {
        bot.sendMessage(chatId, "Добро пожаловать! \n\nIP: `sber.deqstudio.com` \nНазвание сервера: любое \n\nИнструкция по подключению:", {
            parse_mode: 'Markdown'
        });
    }
}