document.addEventListener('DOMContentLoaded', function () {

    ctx.lineWidth = 3;  //펜선 굵기
    //펜선 굵기 슬라이드바 로직
    const lineWidthSlider = document.getElementById('lineWidthSlider');
    lineWidthSlider.addEventListener('input', (event) => {
        ctx.lineWidth = event.target.value;
        sliderValue.textContent = event.target.value;
    });

    function stopPainting() {
        painting = false;
        isSave = 0;
    }

    function startPainting() {
        painting = true;
    }


    function onMouseMove(event) {
        if (!isDrawing) return; // 선 그리기가 활성화되어 있지 않으면 아무것도 하지 않음
        const x = event.offsetX;
        const y = event.offsetY;

        if (!painting) {
            ctx.beginPath();
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", startPainting);
    canvas.addEventListener("mousedown", saveState);
    canvas.addEventListener("mouseup", stopPainting);
    canvas.addEventListener("mouseleave", stopPainting);

    const buttons = [
        "red", "orange", "yellow", "green", "blue",
        "navy", "purple", "black", "white", "clear",
        "fill", "undo", "redo"
    ];
    let lineColor = "black";

    let selectedButton = null; // 현재 선택된 버튼을 추적

    buttons.forEach((color) => {
        const button = document.querySelector(`.${color}`);
        button.style.background = (color === "clear" || color === "fill") ? "rgba(100,100,100,0.2)" : color;
        button.onclick = () => {
            ctx.strokeStyle = color;
            lineColor = color;

            if (selectedButton) {
                console.log(selectedButton);
                selectedButton.classList.remove('highlight');
            }

            // 현재 선택된 버튼에 하이라이트 추가
            button.classList.add('highlight');
            selectedButton = button;
        };
    });

    document.querySelector(".clear").onclick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    document.querySelector(".fill").onclick = () => {
        ctx.fillStyle = lineColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    document.querySelector(".undo").onclick = () => {
        console.log(undoStack.length);
        restoreState(undoStack, redoStack);
    };

    document.querySelector(".redo").onclick = () => {
        restoreState(redoStack, undoStack);
    };


    function saveState() {

        if (isSave == 0) {
            console.log(undoStack.length);
            console.log("저장")
            isSave = 1;
            undoStack.push(canvas.toDataURL());
        }
    }

    function restoreState(stack, oppositeStack) {
        if (stack.length > 0) {
            oppositeStack.push(canvas.toDataURL());
            const imgData = stack.pop();
            const img = new Image();
            img.src = imgData;
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                ctx.drawImage(img, 0, 0);
            };
        }
    }


});