package com.house.service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class BatchResultDTO {
    @JsonProperty(value = "predicted_price")
    private Double predictedPrice;
}
