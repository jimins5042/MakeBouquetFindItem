

document.addEventListener('DOMContentLoaded', function () {


    const canvas = document.querySelector("#canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const colorThief = new ColorThief();

    // 파일 선택 시 해시 버튼 활성화
    window.enableCalHashButton = function () {
        const showHashBtn = document.getElementById("showHashBtn");
        showHashBtn.disabled = false;
    }


    //===== canvas 로직 시작==========
    let fileUpload = function () {
        document.getElementById("fileInput").click();
    };

    canvas.addEventListener("click", fileUpload);


    // 파일이 선택되면 이미지로 로드하고 canvas에 그리기
    document.getElementById("fileInput").addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                img.src = e.target.result;
                img.onload = () => {
                    drawImageOnCanvas(img);
                    /*
                                        const palette = colorThief.getPalette(img, 5); // 5가지 색상 추출
                    
                                        console.log("파레트 1", palette[0]);
                    
                                        // 기존 동그라미 초기화 및 새 동그라미 추가
                                        const colorDisplay1 = document.getElementById('color-display');
                                        colorDisplay1.innerHTML = ''; // 이전 동그라미 초기화
                                        palette.forEach(color => {
                                            const hexColor = rgbToHex(color);
                                            const colorCircle = document.createElement('div');
                                            colorCircle.className = 'color-circle';
                                            colorCircle.style.backgroundColor = hexColor; // 동그라미 색상 표시
                                            colorDisplay1.appendChild(colorCircle);
                                        });
                    
                    */

                };
            };
            reader.readAsDataURL(file);
        }
    });

    function drawImageOnCanvas(image) {
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        const imgWidth = image.width;
        const imgHeight = image.height;

        const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
        const x = (canvasWidth - imgWidth * scale) / 2;
        const y = (canvasHeight - imgHeight * scale) / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, x, y, imgWidth * scale, imgHeight * scale);
    }

    function resizeCanvas() {
        const container = document.querySelector("#canvasContainer");
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // 이미지 업로드 처리 함수
    async function showHash(actionUrl) {


        let fileInput = document.getElementById('fileInput');

        if (fileInput.files.length === 0) {

            alert('Please select a file to upload.');
            return;
        }

        const rgbColor = colorThief.getColor(img);

        const formData = new FormData();
        formData.append('image', fileInput.files[0]);
        formData.append('rgb', JSON.stringify(rgbColor));

        const response = await fetch(`${actionUrl}`, {

            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            const data = await response.json();
            const previewImage = document.getElementById('preview');

            // 서버에서 받은 items로 제품 목록을 동적으로 생성
            const productList = document.getElementById("productList");
            productList.classList.remove("hide"); // 숨겨진 제품 목록을 보이게 함

            // 기존 목록 비우기
            productList.innerHTML = '';

            // 서버에서 받은 items 배열을 사용하여 제품 목록 생성
            data.items.forEach(item => {
                const productDiv = document.createElement('div');
                productDiv.classList.add('card'); // 카드 스타일 유지

                // 동적으로 상품 카드 HTML 생성
                productDiv.innerHTML = `
        <a href="/shop/items/${item.item_id}">
            <img class="card-img-top" src="${item.image_url}" alt="${item.item_title}" loading="lazy">
        </a>
        <div class="card-body">
            <div class="text-center">
                <h5 class="fw-bolder">${item.item_title}</h5>
                <span>${item.item_price} 원</span>
                <span>유사도 : ${item.similarity}</span>
            </div>
        </div>
    `;
                productList.appendChild(productDiv); // productList에 카드 추가
            });


        } else {
            alert('Image upload failed');
        }
    }

    // RGB를 헥스 코드로 변환하는 함수
    function rgbToHex(rgbArray) {

        console.log(rgbArray);
        return "#" + rgbArray.map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }).join('');
    }

    //===== canvas 로직 끝==========

    // 이미지 업로드 후 미리보기 설정

    window.submitForm = function (actionUrl) {
        showHash(actionUrl);
    };

});