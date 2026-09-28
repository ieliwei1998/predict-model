package com.house.response;


import lombok.Data;

import java.util.Map;

@Data
public class WhatIfResponse {

    private Double basePrice;

    private Double modifiedPrice;

    private Double difference;

    private Map<String, Double> breakdown;
}
