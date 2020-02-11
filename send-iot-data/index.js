const mqtt = require("azure-iot-device-mqtt").Mqtt;
const deviceClient = require("azure-iot-device").Client;
const message = require("azure-iot-device").Message;
var Protocol = require("azure-iot-device-amqp").Amqp;
var {deviceConnectionString, deviceTwinConnectionString} = require("./connection-strings.json");

/* Twin **/
var Client = require("azure-iot-device").Client;
var Protocol = require("azure-iot-device-amqp").Amqp;
// Copy/paste your module connection string here.
var moduleTwinClient = Client.fromConnectionString(deviceTwinConnectionString, Protocol);
// Twin ends

const client = deviceClient.fromConnectionString(deviceConnectionString, mqtt);

let temperature;
let pressure;
let humidity;

const printResultFor = op => {
    return (err, res) => {
        if (err) console.log(op + " error: " + err.toString());
        if (res) console.log(op + " status: " + res.constructor.name);
    };
}


// NOT NEEDED FOR NOW
/*
const prependZeroes = (value) => {
    return value.length === 3
            ? "0" + value
            : value.length === 2
                ? "00" + value
                : value.length === 1
                    ? "000" + value
                    : value;
}

const getTemperature = (temp) => {
    let temperature;
    if (temp >= 0) {
        const scaleTemp = parseInt(temp / 0.005, 10);
        const hexedTemp = scaleTemp.toString(16);
        temperature = prependZeroes(hexedTemp);
    } else if (temp < 0) {
        let scaleTemp = parseInt(-1 * temp / 0.005, 10);
        const hexedTemp = scaleTemp.toString(16);
        scaleTemp = parseInt(hexedTemp, 16);
        const hexedAllOnes = new Number(65535).toString(16);
        const allOnes = parseInt(hexedAllOnes, 16);
        temperature = ((scaleTemp ^ allOnes) + 1).toString(16);
    }
    return temperature;
}


const format = (temp, hum, pres, message) => {

    const temperature = getTemperature(temp);

    const scaledHumidity = parseInt(hum / 0.0025, 10);
    const hexedHumidity = scaledHumidity.toString(16);
    const humidity = prependZeroes(hexedHumidity);

    const scaledPressure = parseInt(pres - 50000, 10);
    const hexedPressure = scaledPressure.toString(16);
    const pressure = prependZeroes(hexedPressure);

    message.data = "00" + temperature + humidity + pressure;
}
*/

setInterval(() => {
    if (!temperature || !humidity || !pressure) return;

    const calcTemperature = temperature.min + Math.random() * (temperature.max - temperature.min);
    const calcHumidity = humidity.min + Math.random() * (humidity.max - humidity.min);
    const calcPressure = pressure.min + Math.random() * (pressure.max - pressure.min);

    let msg = { temperature: calcTemperature, humidity: calcHumidity, pressure: calcPressure };

    const data = JSON.stringify(msg);
    const telemetryMessage = new message(data);

    telemetryMessage.properties.add("temperatureAlert", calcTemperature > temperature.maxAlert ||calcTemperature < temperature.minAlert ? "true" : "false");
    telemetryMessage.properties.add("humidityAlert", calcHumidity > humidity.maxAlert || calcHumidity < humidity.minAlert ? "true" : "false");
    telemetryMessage.properties.add("pressureAlert", calcPressure > pressure.maxAlert || calcPressure < pressure.minAlert ? "true" : "false");

    client.sendEvent(telemetryMessage, printResultFor("send"))
}, 2500);



moduleTwinClient.on("error", function(err) {
    console.error(err.message);
});
// connect to the hub
moduleTwinClient.open(function(err) {
    if (err) {
        console.error("error connecting to hub: " + err);
        process.exit(1);
    }
    console.log("client opened");
    // Create device Twinmessage
    moduleTwinClient.getTwin(function(err, twin) {
        if (err) {
            console.error("error getting twin: " + err);
            process.exit(1);
        }
        // Output the current properties
        console.log("twin contents:");
        console.log(twin.properties);
        // Add a handler for desired property changes
        twin.on("properties.desired", function(delta) {
            console.log("new desired properties received:");
            console.log(JSON.stringify(delta));

            temperature = delta.temperature;
            pressure = delta.pressure;
            humidity = delta.humidity;

        });
        // create a patch to send to the hub
        var patch = {
            updateTime: new Date().toString(),
            firmwareVersion: "1.2.1",
            weather: {
                temperature: 72,
                humidity: 17
            }
        };
        // send the patch
        twin.properties.reported.update(patch, function(err) {
            if (err) throw err;
            console.log("twin state reported");
        });
    });
});

