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

/*    const buttons = [
        "red", "orange", "yellow", "green", "blue",
        "navy", "purple", "black", "white", "clear",
        "fill", "undo", "redo", "freecolor"
    ];
    */
    const buttons = [
        "red", "orange", "yellow", "green", "blue",
        "navy", "purple", "black", "white", "clear",
        "undo", "redo", "freecolor"
    ];
    let lineColor = "black";

    let selectedButton = null; // 현재 선택된 버튼을 추적

    const colorMap = {
        red: "red",
        orange: "orange",
        yellow: "yellow",
        green: "green",
        blue: "blue",
        navy: "navy",
        purple: "purple",
        black: "black",
        white: "white",
        clear: "rgba(100,100,100,0.2)",
        //fill: "rgba(100,100,100,0.2)",
        freecolor: "#000000"  // 초기값을 검정으로 설정
    };

    buttons.forEach((color) => {
        const button = document.querySelector(`.${color}`);
        button.style.background = colorMap[color];  // colorMap을 통해 색상 설정

        button.onclick = () => {
            isDrawing = true;
            isAddingImage = false;

            ctx.strokeStyle = colorMap[color];  // 선 색상도 colorMap을 통해 설정
            lineColor = colorMap[color];

            if (selectedButton) {
                selectedButton.classList.remove('highlight');
            }

            button.classList.add('highlight');
            selectedButton = button;
        };
    });


    document.querySelector(".clear").onclick = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
/*
    document.querySelector(".fill").onclick = () => {
        ctx.fillStyle = lineColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    */

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

    /*
    
        // RGB 값을 받아 freecolor 버튼의 배경색과 선 색상을 실시간으로 변경
        function updateFreeColorLive() {
            const r = document.getElementById('rValue').value;
            const g = document.getElementById('gValue').value;
            const b = document.getElementById('bValue').value;
    
            const rgbColor = `rgb(${r}, ${g}, ${b})`;
    
            // freecolor 버튼의 배경색 실시간으로 변경
            const freecolorButton = document.querySelector('.freecolor');
            freecolorButton.style.background = rgbColor;
    
            // canvas의 선 색상도 실시간으로 변경
            ctx.strokeStyle = rgbColor;
            lineColor = rgbColor;  // 현재 사용되는 선 색상도 업데이트
        }
    
        // RGB 입력창의 값이 변경될 때마다 실시간으로 색상 업데이트
        document.getElementById('rValue').addEventListener('input', updateFreeColorLive);
        document.getElementById('gValue').addEventListener('input', updateFreeColorLive);
        document.getElementById('bValue').addEventListener('input', updateFreeColorLive);
    
        // 팔레트에서 freecolor 버튼 클릭 시 색상 적용 (선택된 색상 변경)
        document.querySelector(".freecolor").onclick = () => {
            isDrawing = true;
            isAddingImage = false;
    
            // freecolor 색상 사용
            ctx.strokeStyle = lineColor;
            lineColor = lineColor;
    
            if (selectedButton) {
                selectedButton.classList.remove('highlight');
            }
    
            // 현재 선택된 버튼에 하이라이트 추가
            const freecolorButton = document.querySelector('.freecolor');
            freecolorButton.classList.add('highlight');
            selectedButton = freecolorButton;
        };
    
    */
    // RGB 슬라이더로 실시간 색상 업데이트
    function updateFreeColorLive() {
        const r = document.getElementById('rSlider').value;
        const g = document.getElementById('gSlider').value;
        const b = document.getElementById('bSlider').value;

        const rgbColor = `rgb(${r}, ${g}, ${b})`;

        // 슬라이더 값을 표시하는 부분도 업데이트
        document.getElementById('rValue').textContent = r;
        document.getElementById('gValue').textContent = g;
        document.getElementById('bValue').textContent = b;

        // freecolor 버튼의 배경색 실시간으로 변경
        const freecolorButton = document.querySelector('.freecolor');
        freecolorButton.style.background = rgbColor;

        // canvas의 선 색상도 실시간으로 변경
        ctx.strokeStyle = rgbColor;
        lineColor = rgbColor;  // 현재 사용되는 선 색상도 업데이트
    }

    // 슬라이더에 input 이벤트 리스너 추가 (RGB 값 변경 시 실시간으로 색상 변경)
    document.getElementById('rSlider').addEventListener('input', updateFreeColorLive);
    document.getElementById('gSlider').addEventListener('input', updateFreeColorLive);
    document.getElementById('bSlider').addEventListener('input', updateFreeColorLive);

    // 팔레트에서 freecolor 버튼 클릭 시 색상 적용 (선택된 색상 변경)
    document.querySelector(".freecolor").onclick = () => {
        isDrawing = true;
        isAddingImage = false;

        // freecolor 색상 사용
        ctx.strokeStyle = lineColor;
        lineColor = lineColor;

        if (selectedButton) {
            selectedButton.classList.remove('highlight');
        }

        // 현재 선택된 버튼에 하이라이트 추가
        const freecolorButton = document.querySelector('.freecolor');
        freecolorButton.classList.add('highlight');
        selectedButton = freecolorButton;
    };




});