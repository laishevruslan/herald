/*
fade-in 

*/

const init = () => {
    Array.from(document.getElementsByClassName("fade-in")).map((element) => element.classList.add("invisible"))
}
// init()