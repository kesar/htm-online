const THRESHOLD = process.env.THRESHOLD || 0.1;
const URL = process.env.URL || 'http://192.168.1.100:8080/cgi-bin/snapshot.sh?res=low&watermark=no';
const PIC_NAME = process.env.PIC_NAME || 'pic.png';

const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

const ColorThief = require('color-thief'),
    colorThief = new ColorThief(),
    fs = require('fs'),
    tinycolor = require('tinycolor2'),
    request = require('request'),
    onecolor = require('onecolor'),
    schedule = require('node-schedule');

const download = async function (uri, filename, callback) {
    request.head(uri, function () {
        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://htm-api.firebaseio.com"
});

const db = admin.firestore();

schedule.scheduleJob('*/5 * * * *', function () {
    (async () => {
        try {
            await download(URL, PIC_NAME, async function () {
                const image = fs.readFileSync(PIC_NAME);
                const rgb = colorThief.getColor(image);
                const rgbCode = 'rgb( ' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')'; // 'rgb(r, g, b)'
                const hex = onecolor(rgbCode).hex();
                const isOpen = tinycolor(hex).getLuminance() > THRESHOLD;
                const document = await db.collection('status').doc('htm');
                console.info(isOpen);
                await document.update({
                    isOpen: isOpen
                });
            });
        } catch (error) {
            console.error(error);
        }
    })();
});