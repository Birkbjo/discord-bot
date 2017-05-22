


class Command {

    constructor() {
        this.inDev = false;
        this.acceptedParams = ['dev', 'verbose'];

    }


    run(msg, commands) {
        if(this.inDev) {
            return
        }

        const rawParams = commands;
        const generalParams = this._pluckParams(this.acceptedParams, rawParams);
        if(generalParams.dev) {
            this.dev = !this.dev;
            msg.reply(`${this.constructor.name} in devMode: ${this.dev}`);
        }
        const curCommandParams = generalParams.filter(elem => !this.acceptedParams.contains(elem));
        this.msg = msg;
        this.rawCommands = commands;
        this.execute(msg);
    }

    execute() {
        throw new Error("execute in Command should not be called directly.")
    }

    _pluckParams(paramsToPluck, params) {
        const plucked = {};
        const specialParams = this.params.filter(elem => !!paramsToPluck[elem])
        specialParams.forEach(param => {
            const paramValue = params[param];
            if (paramValue) {
                plucked[param] = paramValue;
            }

        })
        return plucked;
    }

}
