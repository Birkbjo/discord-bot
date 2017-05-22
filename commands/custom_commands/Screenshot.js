const Pageres = require("pageres");
module.exports = class ScreenshotCommand {

    static acceptedCommands = {

    }

    constructor(msg, command) {

    }


    run() {

        function captureScreenShot(wclURL, opts) {
            const pageres = new Pageres({selector: '.dataTables_wrapper table'})
                .src(wclURL, ['1920x1080'])
                .run()
            return pageres;
        }
    }
}
