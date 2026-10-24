export class MessageBroadcaster {
    #receivers = []

    constructor(parent) {
        this.parent = parent
    }

    addReceiver(observer) {
        if (Array.isArray(observer)) {
            this.#receivers.push(...observer)
        } else {
            this.#receivers.push(observer)
        }
    }
    removeReceiver(observer) {
        this.#receivers.splice(this.#receivers.indexOf(observer), 1)
    }

    notify(entity, event) {
        for (let receiver of this.#receivers) {
            receiver.onNotify(entity, event)
        }
    }
}

export class MessageReceiver {
    constructor(parent) {
        this.parent = parent
        if (parent.onNotify) this.onNotify = parent.onNotify
    }

    onNotify(entity, event) {
        console.log(entity, event)
    }
}

export class Event {
    constructor(which, args) {
        this.which = which
        this.args = args
    }
}