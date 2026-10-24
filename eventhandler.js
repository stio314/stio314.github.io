import { mobileDebugLog } from './util.js'

const NOTIFY_LOGGING = false

export class EventHandler {
    constructor(parent, parentName) {
        this.eventHandlers = new Map()
        this.parent = parent
        this.parentName = parentName

        this.parent.onNotify = (entity, event) => {
            if (NOTIFY_LOGGING) {
                console.log(
                    this.parentName || this.parent,
                    'notified of event: ',
                    event.which,
                    event.args
                )
                mobileDebugLog(event.which)
            }

            this.handleEvent(entity, event)
        }
    }

    add(event, func) {
        this.eventHandlers.set(event, func)
    }
    remove(event) {
        this.eventHandlers.delete(event)
    }

    handleEvent(entity, event) {
        if (!this.eventHandlers.has(event.which)) return
        this.eventHandlers.get(event.which)(entity, event)
    }
}
