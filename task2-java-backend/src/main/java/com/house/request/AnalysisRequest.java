package com.house.request;

import lombok.Data;

@Data
public class AnalysisRequest {
    Integer minBedrooms;

    Integer maxBedrooms;

    Double minSchoolRating;

    Double minPrice;

    Double maxPrice;

    Double minSqft;

    Double maxSqft;

    Double minDistance;

    Double maxDistance;
}