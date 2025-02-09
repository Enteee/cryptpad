const Block = require("../commands/block");
const MFA = require("../storage/mfa");
const Util = require("../common-util");

const Commands = module.exports;

var isValidBlockId = Block.isValidBlockId;

// Read the MFA settings for the given public key
const checkMFA = (Env, publicKey, cb) => {
    // Success if we can't get the MFA settings
    MFA.read(Env, publicKey, function (err, content) {
        if (err) {
            if (err.code !== "ENOENT") {
                Env.Log.error('TOTP_VALIDATE_MFA_READ', {
                    error: err,
                    publicKey: publicKey,
                });
            }
            return void cb();
        }

        var parsed = Util.tryParse(content);
        if (!parsed) { return void cb(); }

        cb("NOT_ALLOWED");
    });
};

// Make sure the block is not protected by MFA but don't do anything else
const check = Commands.MFA_CHECK = function (Env, body, cb) {
    var { publicKey } = body;
    if (!isValidBlockId(publicKey)) { return void cb("INVALID_KEY"); }
    checkMFA(Env, publicKey, cb);
};
check.complete = function (Env, body, cb) { cb(); };

// Write a login block IFF
// 1. You can sign for the block's public key
// 2. the block is not protected by MFA
// Note: the internal WRITE_LOGIN_BLOCK will check is you're allowed to create this block
const writeBlock = Commands.WRITE_BLOCK = function (Env, body, cb) {
    const { publicKey, content } = body;

    // they must provide a valid block public key
    if (!isValidBlockId(publicKey)) { return void cb("INVALID_KEY"); }
    if (publicKey !== content.publicKey) { return void cb("INVALID_KEY"); }

    // check MFA
    checkMFA(Env, publicKey, cb);
};

writeBlock.complete = function (Env, body, cb) {
    const { content } = body;
    Block.writeLoginBlock(Env, content, cb);
};

// Remove a login block IFF
// 1. You can sign for the block's public key
// 2. the block is not protected by MFA
const removeBlock = Commands.REMOVE_BLOCK = function (Env, body, cb) {
    const { publicKey } = body;

    // they must provide a valid block public key
    if (!isValidBlockId(publicKey)) { return void cb("INVALID_KEY"); }

    // check MFA
    checkMFA(Env, publicKey, cb);
};

removeBlock.complete = function (Env, body, cb) {
    const { publicKey } = body;
    Block.removeLoginBlock(Env, publicKey, cb);
};


