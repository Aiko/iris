// Cleans up some stuff and limits user interaction that would mess
// with our electron setup! :- )

$(document).ready(function () {

    // Disable CTRL Mouse Click
    $('a').click(function (e) {
        if (e.ctrlKey) {
            return false;
        }
    })

    // Disable SHIFT Mouse Click
    $('a').click(function (e) {
        if (e.shiftKey) {
            return false;
        }
    })

})



// The following function will catch all non-left (middle and right) clicks
function handleNonLeftClick(e) {
    // e.button will be 1 for the middle mouse button.
    if (e.button === 1) {
        // Check if it is a link (a) element; if so, prevent the execution.
        if (e.target.tagName.toLowerCase() === "a") {
            e.preventDefault();
        }
    }
}

window.onload = () => {
    // Attach the listener to the whole document.
    document.addEventListener("auxclick", handleNonLeftClick);
}