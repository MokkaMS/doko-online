const rooms: any = Object.create(null);
console.log('rooms.toString:', rooms.toString);
if (rooms.toString !== undefined) {
    console.error('FAIL: rooms.toString should be undefined');
    process.exit(1);
}

console.log('rooms["__proto__"]:', rooms["__proto__"]);
if (rooms["__proto__"] !== undefined) {
    console.error('FAIL: rooms["__proto__"] should be undefined');
    process.exit(1);
}

rooms["test"] = { id: "test" };
console.log('rooms.test:', rooms.test);
if (rooms.test.id !== "test") {
    console.error('FAIL: rooms.test should be { id: "test" }');
    process.exit(1);
}

console.log('Rooms security test passed!');
