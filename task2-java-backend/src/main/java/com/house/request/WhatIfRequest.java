package com.house.request;

import lombok.Data;

@Data
public class WhatIfRequest {

    private Double baseSquareFootage;

    private Integer baseBedrooms;

    private Double baseBathrooms;

    private Integer baseYearBuilt;

    private Double baseLotSize;

    private Double baseDistanceToCityCenter;

    private Double baseSchoolRating;

    private Double newSquareFootage;

    private Integer newBedrooms;

    private Double newBathrooms;

    private Integer newYearBuilt;

    private Double newLotSize;

    private Double newDistanceToCityCenter;

    private Double newSchoolRating;
}
