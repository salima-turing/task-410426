const http = require('http');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');

const port = 8080;
const clients = [];
const predictionAlgorithms = {
    random: () => Math.random() < 0.5,
    weighted: (prevOutcomes) => {
        let weightedSum = 0;
        let count = 0;
        prevOutcomes.forEach((outcome) => {
            weightedSum += outcome ? 1 : -1;
            count++;
        });
        return weightedSum > 0;
    }
};
let metrics = {};

function startServer() {
    const server = http.createServer((req, res) => {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Not found');
    });

    const wss = new WebSocket.Server({ server });

    console.log(`Server is running on ws://localhost:${port}`);

    wss.on('connection', (ws) => {
        clients.push(ws);

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                if (data.type === 'start_simulation') {
                    startSimulation(data.algorithm, data.iterations, ws);
                }
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        });

        ws.on('close', () => {
            clients.splice(clients.indexOf(ws), 1);
        });
    });

    server.listen(port, () => {
        console.log(`Server is listening on http://localhost:${port}`);
    });
}

function startSimulation(algorithm, iterations, client) {
    const algorithmFunction = predictionAlgorithms[algorithm];
    if (!algorithmFunction) {
        client.send(JSON.stringify({ error: 'Invalid prediction algorithm' }));
        return;
    }

    let correctPredictions = 0;
    let prevOutcomes = [];

    metrics[algorithm] = metrics[algorithm] || [];

    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
        const realOutcome = Math.random() < 0.5;
        const predictedOutcome = algorithmFunction(prevOutcomes);
        prevOutcomes.push(realOutcome);

        if (predictedOutcome === realOutcome) {
            correctPredictions++;
        }
    }

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    const accuracy = (correctPredictions / iterations) * 100;

    metrics[algorithm].push({
        time: performance.now(),
        accuracy: accuracy.toFixed(2),
        iterations: iterations
    });

    console.log(`Algorithm: ${algorithm}, Iterations: ${iterations}, Accuracy: ${accuracy}%, Execution Time: ${executionTime} ms`);

    client.send(JSON.stringify({
        algorithm,
        iterations,
        accuracy,
        executionTime
    }));
}

startServer();
