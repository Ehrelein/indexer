export namespace DevMode {
    let _on = false
    export function toggle(on: boolean) {
        _on = on
    }
    export function isOn() {
        return _on
    }
}
