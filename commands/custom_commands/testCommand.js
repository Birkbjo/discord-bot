


class Command {

    constructor() {
        this.inDev = false;
        this.acceptedParams = {
            dev: 'dev',
            verbose: 'verbose'
        };

    }


    run(msg, commands) {
        if(this.inDev) {
            return
        }

        const rawParams = commands;
        const generalParams = this._pluckParams(this.acceptedParams, rawParams);

        const curCommandParams = generalParams.filter(elem => !this.acceptedParams[elem]);

        this.execute(msg, curCommandParams);
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


class TestCommand extends Command {

    constructor() {
        super();
    }

    execute(msg, commands) {
        console.log("Run from inheritance")
    }


}


const t = new TestCommand();

t.run();

