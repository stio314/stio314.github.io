export function clamp(number, min, max) {
    return Math.min(Math.max(number, min), max)
}

export function componentToHex(c) {
    var hex = c.toString(16)
    return hex.length == 1 ? "0" + hex : hex
}

export function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b)
}

export function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
     ] : null
}

export function isValidHexColor(color) {
    return /^#[0-9A-F]{6}$/i.test(color)
}

export function unlerp(a, b, x) {
    return (x - a) / (b - a)
}

export function colorsEqual(color1, color2) {
    if (color1 === false || color1 === undefined || color2 === false || color2 === undefined) return false
    return color1[0] === color2[0] && color1[1] === color2[1] && color1[2] === color2[2]
}


let mobileDebugLogIncrement = 0
export function mobileDebugLog(string) {
    const el = document.querySelector('.submission-text')
    const v = `${mobileDebugLogIncrement}: ${string}, `

    el.value += v
    el.scrollLeft = el.scrollWidth

    console.log(v)

    mobileDebugLogIncrement++
}
// safari ha ha
export const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
