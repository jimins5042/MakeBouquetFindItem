# 이미지 검색 기반 추천 시스템

> Perceptual Hash와 LSH 기법을 사용한 유사 이미지 검색 및 상품 추천 시스템 <br>
> 개발기간 : 2024.10 ~ 2024.12

---

# 프로젝트 소개

본 프로젝트에서는 생성형 AI의 산출물을 상업적 목적으로 활용하고자, 내용 기반 이미지 검색(Content-Based Image Retrieval, CBIR) 기술을 활용하여 사용자가 제공한 질의 이미지와 유사한 이미지를 추천하는 기법을 제안한다. <br> 
이미지 간의 세밀한 차이를 감지할 수 있도록 pHash의 구조를 개선한 다음, 개선한 pHash와 Color Thief 라이브러리를 활용하여 이미지의 고유 정보를 추출한다. <br>
LSH 알고리즘을 통해 질의 이미지의 해시값과 일부 일치하는 상품을 선별한 다음, 해밍 거리(Hamming Distance)와 자카드 유사도를 사용하여 최종 추천 상품 목록을 산출한다.

---

