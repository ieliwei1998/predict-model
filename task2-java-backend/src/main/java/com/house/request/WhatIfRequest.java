package com.house.request;

import lombok.Data;

import java.util.Objects;

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

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        WhatIfRequest that = (WhatIfRequest) o;

        return eqDouble(baseSquareFootage, that.baseSquareFootage) &&
                Objects.equals(baseBedrooms, that.baseBedrooms) &&
                eqDouble(baseBathrooms, that.baseBathrooms) &&
                Objects.equals(baseYearBuilt, that.baseYearBuilt) &&
                eqDouble(baseLotSize, that.baseLotSize) &&
                eqDouble(baseDistanceToCityCenter, that.baseDistanceToCityCenter) &&
                eqDouble(baseSchoolRating, that.baseSchoolRating) &&
                eqDouble(newSquareFootage, that.newSquareFootage) &&
                Objects.equals(newBedrooms, that.newBedrooms) &&
                eqDouble(newBathrooms, that.newBathrooms) &&
                Objects.equals(newYearBuilt, that.newYearBuilt) &&
                eqDouble(newLotSize, that.newLotSize) &&
                eqDouble(newDistanceToCityCenter, that.newDistanceToCityCenter) &&
                eqDouble(newSchoolRating, that.newSchoolRating);
    }

    @Override
    public int hashCode() {
        return Objects.hash(
                roundHash(baseSquareFootage),
                baseBedrooms,
                roundHash(baseBathrooms),
                baseYearBuilt,
                roundHash(baseLotSize),
                roundHash(baseDistanceToCityCenter),
                roundHash(baseSchoolRating),
                roundHash(newSquareFootage),
                newBedrooms,
                roundHash(newBathrooms),
                newYearBuilt,
                roundHash(newLotSize),
                roundHash(newDistanceToCityCenter),
                roundHash(newSchoolRating)
        );
    }

    private static final double TOLERANCE = 0.001;

    private boolean eqDouble(Double a, Double b) {
        if (Objects.equals(a, b)) return true;
        if (a == null || b == null) return false;
        return Math.abs(a - b) < TOLERANCE;
    }

    private Double roundHash(Double v) {
        if (v == null) return null;
        return Math.round(v * 1000) / 1000.0;
    }
}
