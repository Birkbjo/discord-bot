const Pageres = require("pageres");
module.exports = class ScreenshotCommand extends Command {

    static acceptedCommands = {

    }

    constructor(msg, command) {
        this.guild = msg.guild;
        this.msg = msg;

    }


    execute() {

        function captureScreenShot(wclURL, opts) {
            const pageres = new Pageres({selector: '.dataTables_wrapper table'})
                .src(wclURL, ['1920x1080'])
                .run()
            return pageres;
        }
    }
}
