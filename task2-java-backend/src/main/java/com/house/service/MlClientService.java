package com.house.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.house.dto.HouseDTO;
import com.house.service.dto.BatchResponseDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class MlClientService {

    @Value("${ml.api.url}")
    private String mlUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public Double predict(HouseDTO house) {
        String jsonBody = getJsonBody(house);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> request = new HttpEntity<>(jsonBody, headers);

        ResponseEntity<BatchResponseDTO> response = restTemplate.exchange(
                mlUrl + "/predict/batch",
                HttpMethod.POST,
                request,
                BatchResponseDTO.class
        );

        if (response.getBody() == null || response.getBody().getResults().isEmpty()) {
            throw new RuntimeException("ML API 返回数据为空");
        }
        return response.getBody().getResults().getFirst().getPredictedPrice();
    }

    private static String getJsonBody(HouseDTO house) {
        ObjectMapper mapper = new ObjectMapper();
        ObjectNode rootNode = mapper.createObjectNode();
        ArrayNode housesArr = rootNode.putArray("houses");

        ObjectNode item = mapper.createObjectNode();
        item.put("square_footage", house.getSquareFootage());
        item.put("bedrooms", house.getBedrooms());
        item.put("bathrooms", house.getBathrooms());
        item.put("year_built", house.getYearBuilt());
        item.put("lot_size", house.getLotSize());
        item.put("distance_to_city_center", house.getDistanceToCityCenter());
        item.put("school_rating", house.getSchoolRating());

        housesArr.add(item);

        return rootNode.toString();
    }


}